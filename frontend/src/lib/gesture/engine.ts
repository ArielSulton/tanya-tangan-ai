/**
 * BrowserGestureEngine
 *
 * Wraps the existing GestureRecognitionService and exposes a small,
 * hook-friendly callback API. Holds the imperative state (initialized,
 * running, last status) so the hook can stay declarative.
 */

import { GestureRecognitionService, type GestureRecognitionResult } from '../ai/services/gesture-recognition'
import type { BrowserGestureResult, EngineStatus } from './types'

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
    if (this.service) {
      void this.service.stop()
      this.service.dispose()
    }
    this.service = null
    this.setState('uninitialized')
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
