/**
 * BrowserGestureEngine
 *
 * Wraps the existing GestureRecognitionService and exposes a small,
 * hook-friendly callback API. Holds the imperative state (initialized,
 * running, last status) so the hook can stay declarative.
 */

import { GestureRecognitionService, type GestureRecognitionResult } from '../ai/services/gesture-recognition'
import type { BrowserGestureResult, EngineStatus } from './types'
import { sortHandsByXPosition } from './normalize'
import { extractFrameFeatures } from './feature-extractor'
import { MotionDetector } from './motion-detector'
import type { FrameFeatures, MotionState, RawHand } from './types'
import { HandPoseService } from '../ai/services/handpose-service'

export interface BrowserGestureEngineCallbacks {
  onResult?: (result: BrowserGestureResult) => void
  onError?: (error: Error) => void
  onStatus?: (status: string) => void
  onStateChange?: (state: EngineStatus) => void
}

export class BrowserGestureEngine {
  private service: GestureRecognitionService | null = null
  private callbacks: BrowserGestureEngineCallbacks
  private state: EngineStatus = 'uninitialized'
  private rawHandPose: HandPoseService | null = null
  private videoEl: HTMLVideoElement | null = null
  private frameBuffer: FrameFeatures[] = []
  private motionDetector = new MotionDetector()
  private pumpHandle: number | null = null
  private readonly FRAME_BUFFER_SIZE = 24

  constructor(callbacks: BrowserGestureEngineCallbacks = {}) {
    this.callbacks = callbacks
  }

  getState(): EngineStatus {
    return this.state
  }

  async initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    this.setState('initializing')
    this.service = new GestureRecognitionService()

    this.service.setOnResult((r) => this.handleServiceResult(r))
    this.service.setOnError((e) => this.callbacks.onError?.(e))
    this.service.setOnStatus((s) => this.callbacks.onStatus?.(s))

    try {
      await this.service.initialize(video, canvas)
      this.setState('ready')
      // Phase 2A: spin up a parallel raw-hand pipeline. Runs in parallel with
      // the existing fingerpose path. Does NOT emit results — just keeps state
      // warm for Phase 2D/2F.
      this.videoEl = video
      this.rawHandPose = new HandPoseService({
        maxNumHands: 2,
        detectionConfidence: 0.7,
        scoreThreshold: 5.0,
        flipHorizontal: true,
      })
      try {
        await this.rawHandPose.initialize()
        this.startRawHandPump()
      } catch (err) {
        console.warn('[gesture] Phase 2A raw-hand pipeline init failed (non-fatal):', err)
        this.rawHandPose = null
      }
    } catch (err) {
      this.service = null
      this.setState('uninitialized')
      throw err
    }
  }

  async start(): Promise<void> {
    if (!this.service) throw new Error('Engine not initialized')
    await this.service.start()
    this.setState('running')
  }

  async stop(): Promise<void> {
    if (!this.service) return
    await this.service.stop()
    this.setState('stopped')
  }

  dispose(): void {
    if (this.pumpHandle !== null) {
      cancelAnimationFrame(this.pumpHandle)
      this.pumpHandle = null
    }
    this.frameBuffer = []
    this.rawHandPose = null
    this.videoEl = null
    if (this.service) {
      void this.service.stop()
      this.service.dispose()
    }
    this.service = null
    this.setState('uninitialized')
  }

  private startRawHandPump(): void {
    const tick = async () => {
      if (!this.rawHandPose || !this.videoEl) return
      try {
        const raws: RawHand[] = await this.rawHandPose.detectRawHands(this.videoEl)
        const pair = sortHandsByXPosition(raws)
        const features = extractFrameFeatures(pair)
        this.frameBuffer.push(features)
        if (this.frameBuffer.length > this.FRAME_BUFFER_SIZE) {
          this.frameBuffer.shift()
        }
        // MotionDetector tracks raw image-space wrist of slot 0 (pre-normalize).
        const sortedRawByX = [...raws].sort((a, b) => a.landmarks[0].x - b.landmarks[0].x)
        const rawSlot0 = sortedRawByX[0]
        if (rawSlot0) {
          this.motionDetector.update({
            x: rawSlot0.landmarks[0].x,
            y: rawSlot0.landmarks[0].y,
          })
        } else {
          this.motionDetector.update(null)
        }
      } catch {
        // Frame failures are non-fatal; just skip this frame.
      }
      this.pumpHandle = requestAnimationFrame(() => void tick())
    }
    this.pumpHandle = requestAnimationFrame(() => void tick())
  }

  /** Phase 2A introspection helper — returns the most recent frame's 84-float
   *  feature vector, or null if no frame has been processed yet. */
  getLatestFrameFeatures(): FrameFeatures | null {
    return this.frameBuffer.length === 0 ? null : this.frameBuffer[this.frameBuffer.length - 1]
  }

  /** Phase 2A introspection helper — returns the current motion state. */
  getMotionState(): MotionState {
    return this.motionDetector.state
  }

  private handleServiceResult(r: GestureRecognitionResult): void {
    const adapted: BrowserGestureResult = {
      letter: r.letter,
      confidence: r.confidence,
      alternatives: r.alternatives,
      timestamp: r.timestamp,
      processingTimeMs: r.processingTime,
      source: 'browser',
    }
    this.callbacks.onResult?.(adapted)
  }

  private setState(next: EngineStatus): void {
    this.state = next
    this.callbacks.onStateChange?.(next)
  }
}
