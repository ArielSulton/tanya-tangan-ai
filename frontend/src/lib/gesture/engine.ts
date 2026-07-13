/**
 * BrowserGestureEngine
 *
 * Wraps the existing GestureRecognitionService and exposes a small,
 * hook-friendly callback API. Holds the imperative state (initialized,
 * running, last status) so the hook can stay declarative.
 */

import { GestureRecognitionService, type GestureRecognitionResult } from '../ai/services/gesture-recognition'
import type { BrowserGestureResult, EngineStatus, GestureEngineCallbacks } from './types'
import { sortHandsByXPosition } from './normalize'
import { extractFrameFeatures } from './feature-extractor'
import type { FrameFeatures, RawHand } from './types'
import { staticClassifier } from './inference/static-classifier'
import { dynamicClassifierV2 } from './inference/dynamic-classifier-v2'
import {
  SequenceStateMachine,
  majorityVote,
  SMOOTH_WINDOW,
  VOTE_MIN_COUNT,
  MIN_FINAL_CONFIDENCE,
  type SequenceState,
} from './sequence-state-machine'

type StaticEngineMode = 'fingerpose' | 'mlp'

// Retained as an alias for the shared engine callback contract so existing
// references keep working; new engines should use GestureEngineCallbacks directly.
export type BrowserGestureEngineCallbacks = GestureEngineCallbacks

export class BrowserGestureEngine {
  private service: GestureRecognitionService | null = null
  private callbacks: BrowserGestureEngineCallbacks
  private state: EngineStatus = 'uninitialized'
  private frameBuffer: FrameFeatures[] = []
  private readonly FRAME_BUFFER_SIZE = 24
  private sequenceStateMachine = new SequenceStateMachine()
  private dynamicPredictionHistory: string[] = []
  // Static-engine selection. Read from NEXT_PUBLIC_STATIC_ENGINE at init.
  // 'mlp' attempts to load the trained classifier; falls back to fingerpose
  // (mlpReady stays false) if model files are missing.
  private staticEngineMode: StaticEngineMode = 'fingerpose'
  private mlpReady = false
  private mlpInflight = false
  // Dev-only: track last sequence state so we log transitions, not every frame.
  private lastLoggedSequenceState: SequenceState | null = null

  constructor(callbacks: BrowserGestureEngineCallbacks = {}) {
    this.callbacks = callbacks
  }

  getState(): EngineStatus {
    return this.state
  }

  async initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    this.setState('initializing')
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
          console.warn('[engine] NEXT_PUBLIC_STATIC_ENGINE=mlp but model failed to load; falling back to fingerpose')
        }
      })
    }
    // Preload dynamic_v2 model in parallel so the first completed window
    // doesn't pay the download + WebGL kernel compile cost (otherwise the
    // user's first dynamic gesture silently misses while it lazy-loads).
    void dynamicClassifierV2.load().then((ok) => {
      if (ok) {
        this.callbacks.onStatus?.('Dynamic engine: GRU ready')
        if (process.env.NODE_ENV === 'development') {
          console.log('[engine] dynamic_v2 GRU model loaded ✓')
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[engine] dynamic_v2 model failed to load — dynamic gestures will never fire')
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
    this.sequenceStateMachine.reset()
    this.dynamicPredictionHistory = []
    this.setState('stopped')
  }

  dispose(): void {
    this.frameBuffer = []
    this.sequenceStateMachine.reset()
    this.dynamicPredictionHistory = []
    if (this.service) {
      void this.service.stop()
      this.service.dispose()
    }
    this.service = null
    this.setState('uninitialized')
  }

  /**
   * Handler invoked by GestureRecognitionService every processed frame with
   * raw multi-hand detections (before sort/normalize). Pushes an 84-float
   * feature vector into the static rolling buffer, and steps the dynamic_v2
   * sequence state machine (Task 10) with the same raw detections.
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

    const step = this.sequenceStateMachine.step(raws)
    if (process.env.NODE_ENV === 'development' && step.state !== this.lastLoggedSequenceState) {
      console.log(`[engine] sequence: ${this.lastLoggedSequenceState ?? 'init'} → ${step.state}`)
      this.lastLoggedSequenceState = step.state
    }
    if (step.shouldPredict && step.frames) {
      void this.runDynamicInference(step.frames)
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

  private async runDynamicInference(frames: number[][]): Promise<void> {
    try {
      const result = await dynamicClassifierV2.classify(frames)
      if (!result) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[engine] dynamic result: NULL (confidence below classifier threshold)')
        }
        return
      }

      this.dynamicPredictionHistory.push(result.label)
      if (this.dynamicPredictionHistory.length > SMOOTH_WINDOW) {
        this.dynamicPredictionHistory.shift()
      }
      const voted = majorityVote(this.dynamicPredictionHistory, VOTE_MIN_COUNT)
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[engine] dynamic candidate: ${result.label} (conf=${result.confidence.toFixed(3)}) vote=${voted ?? 'none'}`,
        )
      }
      if (voted && result.confidence >= MIN_FINAL_CONFIDENCE) {
        const adapted: BrowserGestureResult = {
          letter: voted,
          confidence: result.confidence,
          alternatives: [],
          timestamp: Date.now(),
          processingTimeMs: 0,
          source: 'browser',
          gestureType: 'dynamic',
        }
        this.callbacks.onResult?.(adapted)
        this.sequenceStateMachine.acceptPrediction()
        this.dynamicPredictionHistory = []
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

  /** Introspection helper — returns the current dynamic-sequence trigger state. */
  getSequenceState(): SequenceState {
    return this.sequenceStateMachine.getState()
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
