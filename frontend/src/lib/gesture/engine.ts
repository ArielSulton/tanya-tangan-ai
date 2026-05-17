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
import { dynamicClassifier } from './inference/dynamic-classifier'
import { staticClassifier } from './inference/static-classifier'
import { DYNAMIC_HISTORY_SIZE, type HistoryPoint } from './recording/types'
import { DYNAMIC_BUFFER_DURATION_MS, resampleToN, type TimedPoint } from './recording/resample'

type StaticEngineMode = 'fingerpose' | 'mlp'

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
  private frameBuffer: FrameFeatures[] = []
  private motionDetector = new MotionDetector()
  // Timestamped wrist trajectory — kept under a rolling DYNAMIC_BUFFER_DURATION_MS
  // window and resampled to DYNAMIC_HISTORY_SIZE uniform points at motion_end
  // so model input shape is constant regardless of host laptop's framerate.
  private dynamicHistory: TimedPoint[] = []
  private readonly DYNAMIC_HISTORY_SIZE = DYNAMIC_HISTORY_SIZE
  private readonly FRAME_BUFFER_SIZE = 24
  // Video reference retained so we can normalize wrist pixel coords to [0,1]
  // before pushing to the dynamic history — matches the standalone recorder's
  // coord space so a single trained model works in both contexts.
  private video: HTMLVideoElement | null = null
  // Static-engine selection. Read from NEXT_PUBLIC_STATIC_ENGINE at init.
  // 'mlp' attempts to load the trained classifier; falls back to fingerpose
  // (mlpReady stays false) if model files are missing.
  private staticEngineMode: StaticEngineMode = 'fingerpose'
  private mlpReady = false
  private mlpInflight = false
  // Dev-only: track last motion state so we log transitions, not every frame.
  private lastLoggedMotionState: MotionState | null = null

  constructor(callbacks: BrowserGestureEngineCallbacks = {}) {
    this.callbacks = callbacks
  }

  getState(): EngineStatus {
    return this.state
  }

  async initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    this.setState('initializing')
    this.video = video
    this.service = new GestureRecognitionService()

    // Resolve static engine selection from env. Validate explicitly — anything
    // other than 'mlp' falls back to fingerpose.
    const envChoice = process.env.NEXT_PUBLIC_STATIC_ENGINE
    this.staticEngineMode = envChoice === 'mlp' ? 'mlp' : 'fingerpose'
    if (this.staticEngineMode === 'mlp') {
      // Try to load the TFJS classifier. Fire-and-await later via a flag;
      // detection itself doesn't block on this. If the model files aren't
      // deployed, mlpReady stays false → fingerpose remains the live path.
      void staticClassifier.load().then((ok) => {
        if (ok) {
          this.mlpReady = true
          this.callbacks.onStatus?.('Static engine: MLP ready')
        } else {
          console.warn(
            '[engine] NEXT_PUBLIC_STATIC_ENGINE=mlp but model failed to load; falling back to fingerpose',
          )
        }
      })
    }
    // Preload dynamic LSTM in parallel so the first motion_end doesn't pay
    // the download + WebGL kernel compile cost (otherwise the user's first
    // dynamic gesture silently misses while the model lazy-loads).
    void dynamicClassifier.load().then((ok) => {
      if (ok) {
        this.callbacks.onStatus?.('Dynamic engine: LSTM ready')
        if (process.env.NODE_ENV === 'development') {
          console.log('[engine] LSTM model loaded ✓')
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[engine] LSTM model failed to load — dynamic gestures will never fire')
      }
    })

    this.service.setOnResult((r) => this.handleServiceResult(r))
    this.service.setOnError((e) => this.callbacks.onError?.(e))
    this.service.setOnStatus((s) => this.callbacks.onStatus?.(s))
    // Phase 2A: subscribe to raw multi-hand frames from the SAME HandPose
    // instance the fingerpose path uses. No second model load, no second
    // inference pass per frame.
    this.service.setOnRawHands((raws) => this.handleRawHands(raws))

    try {
      await this.service.initialize(video, canvas)
      this.setState('ready')
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__gestureEngine = this
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
    this.dynamicHistory = []
    this.motionDetector.update(null)
    this.setState('stopped')
  }

  dispose(): void {
    this.frameBuffer = []
    this.dynamicHistory = []
    this.motionDetector.update(null)
    if (this.service) {
      void this.service.stop()
      this.service.dispose()
    }
    this.service = null
    this.setState('uninitialized')
  }

  /**
   * Phase 2A: handler invoked by GestureRecognitionService every processed
   * frame with raw multi-hand detections (before sort/normalize). Pushes
   * an 84-float feature vector into the rolling buffer and updates the
   * motion detector with the raw (image-space) wrist of slot 0.
   */
  private handleRawHands(raws: RawHand[]): void {
    const pair = sortHandsByXPosition(raws)
    const features = extractFrameFeatures(pair)
    this.frameBuffer.push(features)
    if (this.frameBuffer.length > this.FRAME_BUFFER_SIZE) {
      this.frameBuffer.shift()
    }

    // If MLP mode is active and the model is loaded, run static inference on
    // this frame's features. fingerpose path's handleServiceResult emit is
    // suppressed when mlpReady is true to avoid duplicate result events.
    if (this.mlpReady && !this.mlpInflight) {
      this.mlpInflight = true
      void this.runStaticInference(features).finally(() => {
        this.mlpInflight = false
      })
    }
    // Wrist trajectory tracked twice for two different consumers:
    //   - MotionDetector keeps PIXEL coords (its variance thresholds are tuned
    //     for pixel-scale jitter/motion).
    //   - dynamicHistory holds [0,1] NORMALIZED coords so the trained model
    //     sees the same coord space whether trained from /dev/ recorder, the
    //     standalone HTML, or live inference here.
    const sortedRawByX = [...raws].sort((a, b) => a.landmarks[0].x - b.landmarks[0].x)
    const rawSlot0 = sortedRawByX[0]
    if (rawSlot0) {
      // Motion detection tracks INDEX FINGER TIP (landmark 8), not wrist.
      // For SIBI dynamic signs like J/Z the fingertip traces the letter while
      // the wrist stays nearly stationary — tracking wrist alone misses these
      // entirely. For whole-hand gestures (terima_kasih) wrist + fingertip
      // move together so trigger still fires reliably.
      const motionLm = rawSlot0.landmarks[8] ?? rawSlot0.landmarks[0]
      const px = { x: motionLm.x, y: motionLm.y }
      this.motionDetector.update(px)
      if (
        process.env.NODE_ENV === 'development' &&
        this.motionDetector.state !== this.lastLoggedMotionState
      ) {
        console.log(
          `[engine] motion: ${this.lastLoggedMotionState ?? 'init'} → ${this.motionDetector.state} (buffer=${this.dynamicHistory.length})`,
        )
        this.lastLoggedMotionState = this.motionDetector.state
      }
      const vw = this.video?.videoWidth || 0
      const vh = this.video?.videoHeight || 0
      const normX = vw > 0 && vh > 0 ? px.x / vw : px.x
      const normY = vw > 0 && vh > 0 ? px.y / vh : px.y
      const t = Date.now()
      this.dynamicHistory.push({ x: normX, y: normY, t })
      // Same hysteresis as PointHistoryRecorder: drop oldest only if the
      // second-oldest is still inside the window, so the buffer reliably
      // reaches the target duration before we resample.
      while (
        this.dynamicHistory.length > 1 &&
        this.dynamicHistory[this.dynamicHistory.length - 1].t - this.dynamicHistory[1].t >= DYNAMIC_BUFFER_DURATION_MS
      ) {
        this.dynamicHistory.shift()
      }
    } else {
      this.motionDetector.update(null)
    }

    // On motion_end, resample buffer to fixed N points spanning the fixed
    // duration window, then dispatch async. The model only sees this shape;
    // laptop FPS variation drops out.
    //
    // Clear `dynamicHistory` after dispatch (or after a too-short reject) so
    // the next gesture starts with a clean buffer — otherwise tail points
    // from gesture N contaminate gesture N+1's window.
    if (this.motionDetector.state === 'motion_end' && this.dynamicHistory.length >= 2) {
      const span = this.dynamicHistory[this.dynamicHistory.length - 1].t - this.dynamicHistory[0].t
      if (span >= DYNAMIC_BUFFER_DURATION_MS * 0.5) {
        const resampled: HistoryPoint[] = resampleToN(
          [...this.dynamicHistory],
          this.DYNAMIC_HISTORY_SIZE,
          DYNAMIC_BUFFER_DURATION_MS,
        )
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[engine] dynamic dispatch: span=${span}ms, n=${this.dynamicHistory.length} → resampled to ${this.DYNAMIC_HISTORY_SIZE}`,
          )
        }
        void this.runDynamicInference(resampled)
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`[engine] dynamic skip: span=${span}ms < ${DYNAMIC_BUFFER_DURATION_MS * 0.5}ms floor`)
      }
      this.dynamicHistory = []
    }
  }

  private async runStaticInference(features: FrameFeatures): Promise<void> {
    try {
      const result = await staticClassifier.classify(features)
      if (result) {
        const adapted: BrowserGestureResult = {
          letter: result.label,
          confidence: result.confidence,
          alternatives: [],
          timestamp: Date.now(),
          processingTimeMs: 0,
          source: 'browser',
          gestureType: 'static',
        }
        this.callbacks.onResult?.(adapted)
      }
    } catch (err) {
      console.warn('[engine] static MLP inference error:', err)
    }
  }

  private async runDynamicInference(history: HistoryPoint[]): Promise<void> {
    try {
      const result = await dynamicClassifier.classify(history)
      if (process.env.NODE_ENV === 'development') {
        if (result) {
          console.log(`[engine] dynamic result: ${result.label} (conf=${result.confidence.toFixed(3)})`)
        } else {
          console.log('[engine] dynamic result: NULL (confidence below classifier threshold)')
        }
      }
      if (result) {
        const adapted: BrowserGestureResult = {
          letter: result.label,
          confidence: result.confidence,
          alternatives: [],
          timestamp: Date.now(),
          processingTimeMs: 0,
          source: 'browser',
          gestureType: 'dynamic',
        }
        this.callbacks.onResult?.(adapted)
      }
    } catch (err) {
      console.warn('[engine] dynamic inference error:', err)
    }
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
    // Suppress fingerpose results when MLP is the active static engine —
    // otherwise both paths would emit and the hook would see duplicate letters.
    if (this.mlpReady) return
    const adapted: BrowserGestureResult = {
      letter: r.letter,
      confidence: r.confidence,
      alternatives: r.alternatives,
      timestamp: r.timestamp,
      processingTimeMs: r.processingTime,
      source: 'browser',
      gestureType: 'static',
    }
    this.callbacks.onResult?.(adapted)
  }

  private setState(next: EngineStatus): void {
    this.state = next
    this.callbacks.onStateChange?.(next)
  }
}
