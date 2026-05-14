/**
 * useGestureRecognition Hook
 *
 * Browser-side A-Z gesture recognition using the existing
 * BrowserGestureEngine (HandPose + Fingerpose). The browser engine is
 * the only inference path in Phase 1 — there is no YOLO fallback.
 * If initialization fails, the hook surfaces the error and stays in
 * a non-running state; the page should communicate this to the user.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { BrowserGestureEngine } from '@/lib/gesture/engine'
import type { BrowserGestureResult } from '@/lib/gesture/types'

interface Bbox {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface GestureResult {
  letter: string
  confidence: number
  alternatives?: { letter: string; confidence: number }[]
  processing_time_ms?: number
  landmarks?: number[][]
  mediapipe_bbox?: Bbox
  yolo_bbox?: Bbox
  validated?: boolean
}

export interface UseGestureRecognitionOptions {
  autoStart?: boolean
  onResult?: (result: GestureResult) => void
  onError?: (error: Error) => void
  onStatus?: (status: string) => void
}

export interface UseGestureRecognitionReturn {
  isInitialized: boolean
  isRunning: boolean
  isLoading: boolean
  error: Error | null
  status: string
  lastResult: GestureResult | null

  start: () => void
  stop: () => void
  initialize: (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => Promise<void>
  captureAndRecognize: (videoElement: HTMLVideoElement) => Promise<GestureResult | null>
  stopRecognition: () => void
  dispose: () => void
}

// Validation tuning. Engine runs at ~30fps; ~24 frames ≈ 0.8s hold.
const VALIDATION_FRAMES = 24
const VALIDATION_MIN_CONFIDENCE = 0.7

// Clear lastResult if engine hasn't emitted in this many ms — i.e., hand is
// gone or no gesture matched. Prevents the UI from showing a stale letter
// badge after the user lowers their hand.
const RESULT_STALE_MS = 600

function toGestureResult(r: BrowserGestureResult, validated: boolean): GestureResult {
  return {
    letter: r.letter,
    confidence: r.confidence,
    alternatives: r.alternatives,
    processing_time_ms: r.processingTimeMs,
    validated,
  }
}

export const useGestureRecognition = (options: UseGestureRecognitionOptions = {}): UseGestureRecognitionReturn => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState('Not initialized')
  const [lastResult, setLastResult] = useState<GestureResult | null>(null)

  const engineRef = useRef<BrowserGestureEngine | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Dwell-time validation: same letter held for VALIDATION_FRAMES consecutive
  // results (above confidence threshold) → emit one validated=true result. We
  // only validate once per hold streak, so the consumer adds the letter once;
  // it won't fire again until the user releases and re-forms a different sign.
  const streakLetterRef = useRef<string | null>(null)
  const streakCountRef = useRef(0)
  const lastEmittedLetterRef = useRef<string | null>(null)
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetStreak = useCallback(() => {
    streakLetterRef.current = null
    streakCountRef.current = 0
    lastEmittedLetterRef.current = null
  }, [])

  const initialize = useCallback(
    async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> => {
      if (engineRef.current) {
        console.warn('[gesture] initialize called while an engine already exists; skipping')
        return
      }

      setIsLoading(true)
      setError(null)
      setStatus('Initializing browser engine...')

      const engine = new BrowserGestureEngine({
        onResult: (r) => {
          // Compute validated flag based on consecutive-frame hold detection.
          let validated = false
          if (r.letter === streakLetterRef.current) {
            streakCountRef.current += 1
          } else {
            streakLetterRef.current = r.letter
            streakCountRef.current = 1
            lastEmittedLetterRef.current = null
          }
          if (
            streakCountRef.current >= VALIDATION_FRAMES &&
            r.confidence >= VALIDATION_MIN_CONFIDENCE &&
            lastEmittedLetterRef.current !== r.letter
          ) {
            validated = true
            lastEmittedLetterRef.current = r.letter
          }
          const result = toGestureResult(r, validated)
          setLastResult(result)
          optionsRef.current.onResult?.(result)
          if (staleTimerRef.current !== null) clearTimeout(staleTimerRef.current)
          staleTimerRef.current = setTimeout(() => {
            setLastResult(null)
            resetStreak()
          }, RESULT_STALE_MS)
        },
        onError: (e) => {
          setError(e)
          optionsRef.current.onError?.(e)
        },
        onStatus: (s) => {
          setStatus(s)
          optionsRef.current.onStatus?.(s)
        },
      })

      // Set ref immediately so a concurrent initialize() call bails out
      // instead of constructing a second engine.
      engineRef.current = engine

      try {
        await engine.initialize(videoElement, canvasElement)
        setIsInitialized(true)
        setStatus('Browser engine ready')

        if (optionsRef.current.autoStart) {
          await engine.start()
          setIsRunning(true)
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        console.error('[gesture] Browser engine init failed:', e)
        engineRef.current = null
        setError(e)
        optionsRef.current.onError?.(e)
        setIsInitialized(false)
        setStatus('Browser engine initialization failed')
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const start = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current
      .start()
      .then(() => setIsRunning(true))
      .catch((err) => {
        const e = err instanceof Error ? err : new Error(String(err))
        console.error('[gesture] engine start failed:', e)
        setError(e)
        optionsRef.current.onError?.(e)
      })
  }, [])

  const stop = useCallback(() => {
    if (!engineRef.current) {
      setIsRunning(false)
      return
    }
    engineRef.current
      .stop()
      .then(() => setIsRunning(false))
      .catch((err) => {
        const e = err instanceof Error ? err : new Error(String(err))
        console.error('[gesture] engine stop failed:', e)
        setError(e)
        optionsRef.current.onError?.(e)
      })
  }, [])

  const captureAndRecognize = useCallback(
    async (_videoElement: HTMLVideoElement): Promise<GestureResult | null> => {
      // The browser engine streams results via callbacks; this method exists
      // for backward compatibility with the previous API. Returns the last
      // known result rather than capturing a fresh frame on demand.
      return lastResult
    },
    [lastResult],
  )

  const stopRecognition = useCallback(() => {
    stop()
  }, [stop])

  const dispose = useCallback(() => {
    engineRef.current?.dispose()
    engineRef.current = null
    setIsInitialized(false)
    setIsRunning(false)
    setStatus('Disposed')
  }, [])

  useEffect(() => {
    return () => {
      if (staleTimerRef.current !== null) clearTimeout(staleTimerRef.current)
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  return {
    isInitialized,
    isRunning,
    isLoading,
    error,
    status,
    lastResult,
    start,
    stop,
    initialize,
    captureAndRecognize,
    stopRecognition,
    dispose,
  }
}
