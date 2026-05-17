/**
 * HandPose Service with Fingerpose Integration
 * Real-time hand detection and gesture recognition using TensorFlow.js HandPose and Fingerpose
 */

import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'
import { loadHandsScript } from '../../gesture/mediapipe-hands-shim'
import { GestureEstimator } from 'fingerpose'
import { SIBI_CONFIG } from '../config/sibi-config'
import Handsigns from '../../../components/handsigns'

// Hand landmark connections for drawing
const fingerJoints = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
}

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface HandPoseDetection {
  landmarks: HandLandmark[]
  confidence: number
  timestamp: number
}

export interface GestureRecognitionResult {
  letter: string
  confidence: number
  alternatives: Array<{ letter: string; confidence: number }>
  timestamp: number
  processingTime: number
}

export interface HandPoseConfig {
  flipHorizontal: boolean
  maxNumHands: number
  detectionConfidence: number
  scoreThreshold: number
}

// Get all SIBI gesture definitions from handsigns directory
class SIBIGestures {
  static getAllGestures() {
    return Object.values(Handsigns)
  }
}

export class HandPoseService {
  private detector: handPoseDetection.HandDetector | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private allGestures: any[] = []
  private isInitialized = false
  private config: HandPoseConfig = {
    flipHorizontal: SIBI_CONFIG.FLIP_HORIZONTAL,
    maxNumHands: SIBI_CONFIG.MAX_NUM_HANDS,
    detectionConfidence: SIBI_CONFIG.MIN_DETECTION_CONFIDENCE,
    scoreThreshold: SIBI_CONFIG.SCORE_THRESHOLD,
  }

  constructor(config?: Partial<HandPoseConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 HandPoseService: Starting initialization...')

      // Initialize TensorFlow.js backend with timeout. Generous bound — wasm
      // backend init can be slow on first cold start on weaker hardware.
      await Promise.race([
        tf.ready(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TensorFlow.js initialization timeout (60s)')), 60_000)),
      ])
      console.log('✅ TensorFlow.js ready with backend:', tf.getBackend())

      // Load the @mediapipe/hands UMD script from CDN before constructing the
      // detector. The bundler-time import is aliased to a shim (see
      // mediapipe-hands-shim.ts); window.Hands must exist by the time
      // createDetector instantiates Hands. loadHandsScript dedupes.
      await loadHandsScript()

      // Load HandPose detector with the 'mediapipe' runtime — uses
      // @mediapipe/hands (WASM/JS solution loaded from JSDelivr CDN) rather
      // than running inference through TF.js. More reliable across browsers:
      // the tfjs runtime returned all-NaN keypoints in our test environment.
      // @mediapipe/hands pulls ~10MB of assets from CDN (wasm + .tflite +
      // .data files) on first load — JSDelivr can be slow under load, so
      // give 90s before bailing. After first load assets are HTTP-cached.
      console.log('📥 Loading HandPose detector (MediaPipeHands model, mediapipe runtime)...')
      this.detector = await Promise.race([
        handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'full',
          maxHands: this.config.maxNumHands,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('HandPose model loading timeout (90s) — check network / try reload')), 90_000)),
      ])
      console.log('✅ HandPose detector loaded successfully (mediapipe runtime)')

      // Store gestures for creating new GestureEstimator instances (match reference pattern)
      this.allGestures = SIBIGestures.getAllGestures()
      console.log('✅ Loaded', this.allGestures.length, 'SIBI gestures (A-Z) for per-detection estimation')
      console.log('Available gestures:', this.allGestures.map((g) => g.name ?? 'unnamed').join(', '))

      this.isInitialized = true
    } catch (error) {
      console.error('❌ HandPose initialization failed:', error)
      throw error
    }
  }

  async detectHands(videoElement: HTMLVideoElement): Promise<HandPoseDetection[]> {
    if (!this.isInitialized || !this.detector) {
      throw new Error('HandPose service not initialized')
    }

    // Validate video element and dimensions
    if (!videoElement || videoElement.readyState < 2) {
      throw new Error('Video element not ready')
    }

    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      throw new Error('Video dimensions not available')
    }

    try {
      const predictions = await this.detector.estimateHands(videoElement, {
        flipHorizontal: this.config.flipHorizontal,
      })

      // Debug: log first detection occasionally
      if (predictions.length > 0) {
        const firstHand = predictions[0]
        const wrist = firstHand.keypoints[0]
        const thumb = firstHand.keypoints[4]
        console.log(
          '👋 Hand detected -',
          firstHand.handedness,
          'Wrist:',
          `(${wrist.x.toFixed(1)}, ${wrist.y.toFixed(1)})`,
          'Thumb tip:',
          `(${thumb.x.toFixed(1)}, ${thumb.y.toFixed(1)})`,
        )
      }

      return predictions.map((prediction) => {
        // Combine 2D pixel-space x,y (from keypoints) with 3D world-space z
        // (from keypoints3D, in meters). Fingerpose curl detection uses 3D
        // angles and produces degenerate output (always one letter, e.g. "H")
        // when z is all zero. Scale z by palm-pixel-size so its order of
        // magnitude matches x,y. Palm size ≈ wrist→middle-MCP distance.
        const kp2d = prediction.keypoints
        const kp3d = prediction.keypoints3D ?? []
        const wristPx = kp2d[0]
        const middleMcpPx = kp2d[9]
        const palmPx = Math.hypot(middleMcpPx.x - wristPx.x, middleMcpPx.y - wristPx.y) || 100
        // keypoints3D z is in meters; palm in 3D is ~0.1m. Scale factor
        // palmPx/0.1 = palmPx*10 maps meters to pixel-similar units.
        const zScale = palmPx * 10

        const landmarks: HandLandmark[] = kp2d.map((kp, i) => ({
          x: kp.x,
          y: kp.y,
          z: kp3d[i] && typeof kp3d[i].z === 'number' ? kp3d[i].z * zScale : 0,
        }))

        return {
          landmarks,
          confidence: prediction.score ?? 0.8,
          timestamp: Date.now(),
        }
      })
    } catch (error) {
      console.error('Hand detection error:', error)
      throw error
    }
  }

  /**
   * Like {@link detectHands}, but returns all detected hands in the shape
   * consumed by the Phase 2 feature pipeline (`lib/gesture/*`). The
   * `RawHand` shape is positional — caller is responsible for sorting and
   * normalizing.
   *
   * Returns an empty array if no hand is detected. Up to `MAX_NUM_HANDS`
   * (2 in Phase 2) hands are returned. With `@tensorflow-models/hand-pose-detection`
   * the underlying MediaPipe model natively supports multi-hand detection.
   */
  async detectRawHands(videoElement: HTMLVideoElement): Promise<import('../../gesture/types').RawHand[]> {
    if (!this.isInitialized || !this.detector) {
      throw new Error('HandPose service not initialized')
    }
    if (!videoElement || videoElement.readyState < 2) {
      throw new Error('Video element not ready')
    }
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      throw new Error('Video dimensions not available')
    }

    const predictions = await this.detector.estimateHands(videoElement, {
      flipHorizontal: this.config.flipHorizontal,
    })

    const raw = predictions.map((p) => {
      const kp2d = p.keypoints
      const kp3d = p.keypoints3D ?? []
      const wristPx = kp2d[0]
      const middleMcpPx = kp2d[9]
      const palmPx = Math.hypot(middleMcpPx.x - wristPx.x, middleMcpPx.y - wristPx.y) || 100
      const zScale = palmPx * 10
      return {
        landmarks: kp2d.map((kp, i) => ({
          x: kp.x,
          y: kp.y,
          z: kp3d[i] && typeof kp3d[i].z === 'number' ? kp3d[i].z * zScale : 0,
        })),
        confidence: p.score ?? 0.8,
      }
    })
    return dedupeOverlappingHands(raw)
  }

  /**
   * Same as detectRawHands but accepts a loaded HTMLImageElement. Used by the
   * bulk image-import flow in /dev/gesture-recorder. Image must have
   * naturalWidth/Height > 0 (i.e., decode complete) — caller is responsible
   * for awaiting the load event before invoking.
   */
  async detectRawHandsFromImage(
    image: HTMLImageElement,
  ): Promise<import('../../gesture/types').RawHand[]> {
    if (!this.isInitialized || !this.detector) {
      throw new Error('HandPose service not initialized')
    }
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error('Image not loaded or has zero dimensions')
    }
    const predictions = await this.detector.estimateHands(image, {
      flipHorizontal: false,
    })
    const raw = predictions.map((p) => {
      const kp2d = p.keypoints
      const kp3d = p.keypoints3D ?? []
      const wristPx = kp2d[0]
      const middleMcpPx = kp2d[9]
      const palmPx = Math.hypot(middleMcpPx.x - wristPx.x, middleMcpPx.y - wristPx.y) || 100
      const zScale = palmPx * 10
      return {
        landmarks: kp2d.map((kp, i) => ({
          x: kp.x,
          y: kp.y,
          z: kp3d[i] && typeof kp3d[i].z === 'number' ? kp3d[i].z * zScale : 0,
        })),
        confidence: p.score ?? 0.8,
      }
    })
    return dedupeOverlappingHands(raw)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async recognizeGesture(landmarks: HandLandmark[]): Promise<GestureRecognitionResult> {
    // Per-frame debug logs commented out (too noisy with MLP path active).
    // Uncomment block-by-block if fingerpose path needs debugging again.
    // console.log('🚀 recognizeGesture called with', landmarks.length, 'landmarks')
    // // Debug: Check if landmarks are actually changing
    // const landmarkHash = landmarks
    //   .slice(0, 5)
    //   .map((l) => `${l.x.toFixed(1)},${l.y.toFixed(1)}`)
    //   .join('|')
    // console.log('🔍 First 5 landmarks hash:', landmarkHash)

    if (!this.allGestures || this.allGestures.length === 0) {
      console.error('❌ Gestures not loaded!')
      throw new Error('Gestures not loaded')
    }

    const startTime = performance.now()

    try {
      // // Debug: Check landmark data format
      // console.log('🔍 Landmarks sample (first 3):')
      // landmarks.slice(0, 3).forEach((lm, i) => {
      //   console.log(`  [${i}] x:${lm.x.toFixed(1)} y:${lm.y.toFixed(1)} z:${lm.z.toFixed(1)}`)
      // })
      // console.log('🔍 Landmarks length:', landmarks.length, 'Expected: 21')

      // Create new GestureEstimator for each detection (match reference pattern)
      const GE = new GestureEstimator(this.allGestures)
      // console.log('🎯 Using threshold:', this.config.scoreThreshold, 'with', this.allGestures.length, 'gestures')

      // FIX: Use correct data format for fingerpose v0.1.0 (raw landmark arrays, not keypoint objects)
      // Convert landmarks back to raw array format that fingerpose expects: [[x,y,z], [x,y,z], ...]
      const rawLandmarks = landmarks.map((landmark) => [landmark.x, landmark.y, landmark.z])
      // console.log('🔧 Using raw landmarks format for fingerpose:', rawLandmarks.length, 'points')

      // Call fingerpose with correct format (match official repository pattern)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gestureResults = GE.estimate(rawLandmarks as any, this.config.scoreThreshold)

      // console.log('📊 Raw results:', gestureResults)

      // // Debug: Check finger analysis from fingerpose
      // if (gestureResults.poseData && gestureResults.poseData.length > 0) {
      //   const fingerData = gestureResults.poseData
      //   console.log('🖐️ Finger analysis:')
      //   console.log('📋 Raw poseData:', fingerData)
      //   fingerData.forEach((finger, idx) => {
      //     const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
      //     console.log(`  Raw finger[${idx}]:`, finger)
      //     if (finger && typeof finger === 'object' && finger.length >= 3) {
      //       // FIX: Correct parsing - finger[1] is curl, finger[2] is direction
      //       console.log(`  ${fingerNames[idx]}: Curl=${finger[1]}, Direction=${finger[2]}`)
      //     } else if (finger && typeof finger === 'object') {
      //       // Try different property access patterns
      //       console.log(`  ${fingerNames[idx]}: Object keys=`, Object.keys(finger))
      //       console.log(`  ${fingerNames[idx]}: Full object=`, finger)
      //     }
      //   })
      // }

      // // Debug: check gesture object structure
      // if (gestureResults.gestures && gestureResults.gestures.length > 0) {
      //   console.log('First gesture object:', gestureResults.gestures[0])
      //   console.log(
      //     'Gestures detected:',
      //     gestureResults.gestures.map((g) => `${g.name}:${g.score.toFixed(1)}`).join(', '),
      //   )
      // } else {
      //   console.log('❌ No gestures detected above threshold', this.config.scoreThreshold)
      // }

      // Process results
      let bestGesture = { name: 'Unknown', score: 0 }
      const alternatives: Array<{ letter: string; confidence: number }> = []

      if (gestureResults.gestures.length > 0) {
        // Use score property (fingerpose library uses 'score', not 'confidence')
        const scores = gestureResults.gestures.map((p) => p.score)
        const maxScore = Math.max(...scores)
        const maxScoreIndex = scores.indexOf(maxScore)

        // console.log('🔍 Scores array:', scores)
        // console.log('🔍 Max score:', maxScore, 'at index:', maxScoreIndex)
        // console.log(
        //   '🔍 All gestures with scores:',
        //   gestureResults.gestures.map((g, i) => `[${i}] ${g.name}:${g.score}`),
        // )

        bestGesture = {
          name: gestureResults.gestures[maxScoreIndex].name,
          score: gestureResults.gestures[maxScoreIndex].score,
        }

        // console.log('→', bestGesture.name, 'selected (', gestureResults.gestures[maxScoreIndex].score.toFixed(1), ')')

        // Get alternatives using score
        for (let i = 0; i < gestureResults.gestures.length; i++) {
          if (i !== maxScoreIndex && alternatives.length < 3) {
            alternatives.push({
              letter: gestureResults.gestures[i].name,
              confidence: gestureResults.gestures[i].score, // Map score to confidence for consistency
            })
          }
        }
      }

      const processingTime = performance.now() - startTime

      // Force confidence to reasonable values
      const cappedConfidence = Math.min(Math.max(bestGesture.score, 0), 1.0)

      // Final gesture result

      return {
        letter: bestGesture.name,
        confidence: cappedConfidence, // Force cap confidence at 100%
        alternatives,
        timestamp: Date.now(),
        processingTime,
      }
    } catch (error) {
      console.error('Gesture recognition error:', error)
      throw error
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.detector !== null && this.allGestures.length > 0
  }

  updateConfig(config: Partial<HandPoseConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): HandPoseConfig {
    return { ...this.config }
  }

  // Manual finger analysis to debug fingerpose issues — kept for future
  // debugging but currently unused (TS6133 hint is intentional; tsc still
  // exits 0). Was previously referenced from the per-frame debug logs that
  // are now commented out above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private analyzeFingerManually(landmarks: any[]): any {
    // MediaPipe hand landmarks indices:
    // Thumb: 1, 2, 3, 4
    // Index: 5, 6, 7, 8
    // Middle: 9, 10, 11, 12
    // Ring: 13, 14, 15, 16
    // Pinky: 17, 18, 19, 20

    const fingers = {
      thumb: [1, 2, 3, 4],
      index: [5, 6, 7, 8],
      middle: [9, 10, 11, 12],
      ring: [13, 14, 15, 16],
      pinky: [17, 18, 19, 20],
    }

    const results: { [key: string]: { curl: string; direction: string } } = {}

    Object.entries(fingers).forEach(([fingerName, joints]) => {
      // Get finger joint positions
      const fingerJoints = joints.map((i) => landmarks[i])

      // Calculate curl based on joint angles (simplified)
      const tip = fingerJoints[3] // fingertip
      const pip = fingerJoints[1] // proximal interphalangeal joint

      // Simple curl calculation: if tip is below pip, finger is curled
      const isCurled = tip.y > pip.y
      const curl = isCurled ? 'FullCurl' : 'NoCurl'

      // Simple direction calculation based on fingertip position relative to base
      const base = fingerJoints[0]
      const deltaX = tip.x - base.x
      const deltaY = tip.y - base.y

      let direction = 'Unknown'
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'HorizontalRight' : 'HorizontalLeft'
      } else {
        direction = deltaY < 0 ? 'VerticalUp' : 'VerticalDown'
      }

      results[fingerName] = { curl, direction }
    })

    return results
  }

  dispose(): void {
    if (this.detector) {
      this.detector.dispose()
    }
    this.detector = null
    this.allGestures = []
    this.isInitialized = false
  }
}

/**
 * MediaPipe sometimes emits two overlapping detections for one physical hand
 * (palm + landmark stages disagreeing). Wrist landmarks within
 * DEDUP_WRIST_DISTANCE_PX of each other are treated as duplicates; keep the
 * one with higher confidence.
 */
const DEDUP_WRIST_DISTANCE_PX = 80

function dedupeOverlappingHands<T extends { landmarks: { x: number; y: number }[]; confidence: number }>(
  hands: T[],
): T[] {
  if (hands.length <= 1) return hands
  const kept: T[] = []
  // Iterate in confidence-desc order so the winner of each cluster is the
  // best-scoring detection.
  const sorted = [...hands].sort((a, b) => b.confidence - a.confidence)
  for (const h of sorted) {
    const w = h.landmarks[0]
    const duplicate = kept.some((k) => {
      const kw = k.landmarks[0]
      const dx = kw.x - w.x
      const dy = kw.y - w.y
      return Math.hypot(dx, dy) < DEDUP_WRIST_DISTANCE_PX
    })
    if (!duplicate) kept.push(h)
  }
  return kept
}

// Drawing function for hand landmarks
export const drawHand = (predictions: HandPoseDetection[], ctx: CanvasRenderingContext2D) => {
  if (predictions.length === 0) return

  predictions.forEach((prediction) => {
    const landmarks = prediction.landmarks

    // Draw finger connections
    Object.values(fingerJoints).forEach((finger) => {
      for (let i = 0; i < finger.length - 1; i++) {
        const firstJointIndex = finger[i]
        const secondJointIndex = finger[i + 1]

        if (landmarks[firstJointIndex] && landmarks[secondJointIndex]) {
          const firstJoint = landmarks[firstJointIndex]
          const secondJoint = landmarks[secondJointIndex]

          ctx.beginPath()
          ctx.moveTo(firstJoint.x, firstJoint.y)
          ctx.lineTo(secondJoint.x, secondJoint.y)
          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    })

    // Draw landmark points
    landmarks.forEach((landmark, index) => {
      ctx.beginPath()
      ctx.arc(landmark.x, landmark.y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = index < 4 ? '#ff0000' : '#0000ff' // Thumb in red, others in blue
      ctx.fill()
    })
  })
}
