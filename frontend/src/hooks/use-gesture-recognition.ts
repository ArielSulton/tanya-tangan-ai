/**
 * useGestureRecognition Hook
 * React hook for A-Z gesture recognition via backend API (YOLO + MediaPipe)
 */

import { useState, useCallback, useRef } from 'react'

const PROXY_URL = ''

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
  // State
  isInitialized: boolean
  isRunning: boolean
  isLoading: boolean
  error: Error | null
  status: string
  lastResult: GestureResult | null

  // Controls
  start: () => void
  stop: () => void
  initialize: (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => Promise<void>
  captureAndRecognize: (videoElement: HTMLVideoElement) => Promise<GestureResult | null>
  stopRecognition: () => void

  // Utility
  dispose: () => void
}

export const useGestureRecognition = (options: UseGestureRecognitionOptions = {}): UseGestureRecognitionReturn => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<string>('Not initialized')
  const [lastResult, setLastResult] = useState<GestureResult | null>(null)

  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recognitionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isRunningRef = useRef(false)
  const sessionIdRef = useRef<string>(crypto.randomUUID())

  // Initialize the system — opens the camera and pipes stream to the video element
  const initialize = useCallback(
    async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        setStatus('Starting camera...')

        videoElementRef.current = videoElement
        canvasRef.current = canvasElement

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { min: 640, ideal: 640 }, height: { min: 480, ideal: 480 }, facingMode: 'user' },
          audio: false,
        })

        streamRef.current = stream
        videoElement.srcObject = stream

        // Wait for video metadata to load
        await new Promise<void>((resolve, reject) => {
          videoElement.onloadedmetadata = () => resolve()
          videoElement.onerror = () => reject(new Error('Video element error'))
        })

        await videoElement.play()

        setIsInitialized(true)
        setStatus('Camera ready')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('Initialization failed:', errorMessage)
        setError(new Error(`Initialization failed: ${errorMessage}`))
        setIsInitialized(false)
        setStatus('Initialization failed')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // Capture frame and send to backend API
  const captureAndRecognize = useCallback(
    async (videoElement: HTMLVideoElement): Promise<GestureResult | null> => {
      try {
        const canvas = canvasRef.current ?? document.createElement('canvas')
        canvas.width = videoElement.videoWidth ?? 640
        canvas.height = videoElement.videoHeight ?? 480
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return null
        }
        ctx.drawImage(videoElement, 0, 0)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

        const response = await fetch(`${PROXY_URL}/api/v1/gesture/recognize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: dataUrl, session_id: sessionIdRef.current }),
        })

        if (!response.ok) {
          return null
        }

        const result: GestureResult & { detected?: boolean } = await response.json()

        if (result.detected === false || !result.letter) {
          setLastResult(null)
          return null
        }

        setLastResult(result)

        if (options.onResult) {
          options.onResult(result)
        }

        return result
      } catch {
        return null
      }
    },
    [options],
  )

  // Start continuous recognition
  const start = useCallback((): void => {
    if (!isInitialized) {
      throw new Error('Not initialized')
    }

    if (!videoElementRef.current) {
      throw new Error('Video element not available')
    }

    try {
      setIsLoading(true)
      setError(null)
      setStatus('Recognition started')
      isRunningRef.current = true
      setIsRunning(true)

      const MIN_IDLE_DELAY_MS = 50 // Prevent tight spin when no hand in frame

      const runLoop = async () => {
        while (isRunningRef.current && videoElementRef.current) {
          if (videoElementRef.current.readyState >= 2) {
            // Await directly — loop rate = YOLO inference time automatically
            const result = await captureAndRecognize(videoElementRef.current)

            // If no hand detected (fast return ~10ms), add small delay
            // to avoid spinning the event loop capturing empty frames
            if (!result) {
              await new Promise((resolve) => setTimeout(resolve, MIN_IDLE_DELAY_MS))
            }
          } else {
            // Video not ready yet, wait briefly
            await new Promise((resolve) => setTimeout(resolve, MIN_IDLE_DELAY_MS))
          }
        }
      }

      void runLoop().catch((err) => console.error('Recognition loop error:', err))
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      isRunningRef.current = false
      setIsRunning(false)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, captureAndRecognize])

  // Stop recognition
  const stop = useCallback((): void => {
    isRunningRef.current = false
    setIsRunning(false)

    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current)
      recognitionIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null
    }
    setIsInitialized(false)
    setStatus('Recognition stopped')
  }, [])

  // Stop recognition (alias for internal use)
  const stopRecognition = useCallback(() => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current)
      recognitionIntervalRef.current = null
    }
    setIsRunning(false)
    setLastResult(null)
    setStatus('Stopped')
  }, [])

  // Dispose of resources
  const dispose = useCallback((): void => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current)
      recognitionIntervalRef.current = null
    }

    // Stop camera stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null
    }

    setIsInitialized(false)
    setIsRunning(false)
    setError(null)
    setStatus('Disposed')
    setLastResult(null)
  }, [])

  return {
    // State
    isInitialized,
    isRunning,
    isLoading,
    error,
    status,
    lastResult,

    // Controls
    start,
    stop,
    initialize,
    captureAndRecognize,
    stopRecognition,

    // Utility
    dispose,
  }
}

export default useGestureRecognition
