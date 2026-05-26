/**
 * YoloGestureEngine
 *
 * Server-side inference engine selected via NEXT_PUBLIC_GESTURE_ENGINE=yolo.
 * Owns its own camera (independent of the MediaPipe path so toggling can never
 * break BrowserGestureEngine), captures throttled JPEG frames, and POSTs them
 * to POST /api/v1/gesture/recognize for YOLOv8 inference. Emits results in the
 * shared BrowserGestureResult shape with `validated` taken from the backend
 * (which runs TemporalValidationService); the hook dedupes those emissions.
 *
 * Implements the shared GestureEngine interface so the hook can swap it in for
 * BrowserGestureEngine with no other changes.
 */

import gestureClient from '@/lib/api/gesture-client'
import { adaptYoloResponse } from './yolo-adapter'
import type { BrowserGestureResult, EngineStatus, GestureEngine, GestureEngineCallbacks } from './types'

// ~6.6 fps. Balances responsiveness against backend load + network latency.
const CAPTURE_INTERVAL_MS = 150
// JPEG quality for the captured frame. 0.6 keeps payloads small while leaving
// enough detail for the detector.
const JPEG_QUALITY = 0.6

export class YoloGestureEngine implements GestureEngine {
  private callbacks: GestureEngineCallbacks
  private state: EngineStatus = 'uninitialized'
  private video: HTMLVideoElement | null = null
  // generateSessionId returns a branded SessionId (extends string) — assign
  // directly; no cast needed since SessionId is a subtype of string.
  private sessionId: ReturnType<typeof gestureClient.generateSessionId> = gestureClient.generateSessionId()
  private captureCanvas: HTMLCanvasElement | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  // Guards against overlapping in-flight requests when the backend is slower
  // than CAPTURE_INTERVAL_MS — we skip a tick rather than queue.
  private inflight = false
  private running = false

  constructor(callbacks: GestureEngineCallbacks = {}) {
    this.callbacks = callbacks
  }

  getState(): EngineStatus {
    return this.state
  }

  async initialize(video: HTMLVideoElement, _canvas: HTMLCanvasElement): Promise<void> {
    this.setState('initializing')
    this.video = video
    this.captureCanvas = document.createElement('canvas')
    try {
      await this.setupCamera(video)
      this.setState('ready')
    } catch (err) {
      this.setState('uninitialized')
      throw err
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async start(): Promise<void> {
    if (!this.video) throw new Error('YoloGestureEngine not initialized')
    if (this.running) return
    this.running = true
    this.setState('running')
    this.scheduleNext()
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async stop(): Promise<void> {
    this.running = false
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.setState('stopped')
  }

  dispose(): void {
    void this.stop()
    if (this.video?.srcObject) {
      const stream = this.video.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      this.video.srcObject = null
    }
    this.video = null
    this.captureCanvas = null
    this.setState('uninitialized')
  }

  private scheduleNext(): void {
    if (!this.running) return
    this.timer = setTimeout(() => void this.tick(), CAPTURE_INTERVAL_MS)
  }

  private async tick(): Promise<void> {
    if (!this.running) return
    if (!this.inflight) {
      const frame = this.captureFrame()
      if (frame) {
        this.inflight = true
        try {
          const res = await gestureClient.recognizeFrame(frame, this.sessionId)
          if (res.success) {
            const adapted = adaptYoloResponse(res.data)
            if (adapted) this.emit(adapted)
          } else {
            this.callbacks.onStatus?.(`YOLO recognize error: ${res.error.message}`)
          }
        } catch (err) {
          this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        } finally {
          this.inflight = false
        }
      }
    }
    this.scheduleNext()
  }

  /** Draw the current video frame to an offscreen canvas and return a base64
   *  JPEG. Returns null until the video has real dimensions. */
  private captureFrame(): string | null {
    const v = this.video
    const c = this.captureCanvas
    if (!v || !c || v.videoWidth === 0 || v.videoHeight === 0) return null
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(v, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', JPEG_QUALITY)
  }

  private emit(result: BrowserGestureResult): void {
    this.callbacks.onResult?.(result)
  }

  private async setupCamera(video: HTMLVideoElement): Promise<void> {
    this.callbacks.onStatus?.('Requesting camera access...')
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user', frameRate: 30 },
      audio: false,
    })
    video.srcObject = stream
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Video element error'))
      setTimeout(() => reject(new Error('Camera setup timeout')), 10000)
    })
    await video.play()
    this.callbacks.onStatus?.('Camera access granted (YOLO engine)')
  }

  private setState(next: EngineStatus): void {
    this.state = next
    this.callbacks.onStateChange?.(next)
  }
}
