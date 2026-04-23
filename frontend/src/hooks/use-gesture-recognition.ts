/**
 * useGestureRecognition Hook
 * React hook for A-Z gesture recognition via backend API (YOLO + MediaPipe)
 */

import { useState, useCallback, useRef } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

interface GestureResult {
  letter: string
  confidence: number
  alternatives?: { letter: string; confidence: number }[]
  processing_time_ms?: number
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
  start: () => Promise<void>
  stop: () => Promise<void>
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

  // Initialize the system
  const initialize = useCallback(
    async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        setStatus('Starting camera...')

        videoElementRef.current = videoElement
        canvasRef.current = canvasElement

        // Small delay to ensure camera stream is ready
        await new Promise((resolve) => setTimeout(resolve, 100))

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
  const captureAndRecognize = useCallback(async (videoElement: HTMLVideoElement): Promise<GestureResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // Capture frame to canvas
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = videoElement.videoWidth || 640
      canvas.height = videoElement.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }
      ctx.drawImage(videoElement, 0, 0)

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/api/v1/gesture/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: dataUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Recognition failed')
      }

      const result: GestureResult = await response.json()

      setLastResult(result)
      setError(null)

      if (options.onResult) {
        options.onResult(result)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Recognition error:', message)
      setError(new Error(message))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  // Start continuous recognition
  const start = useCallback(async (): Promise<void> => {
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

      const FRAME_INTERVAL_MS = 500 // Capture and send frame every 500ms

      const runRecognition = async () => {
        if (videoElementRef.current && videoElementRef.current.readyState >= 2) {
          await captureAndRecognize(videoElementRef.current)
        }
      }

      // Run first frame immediately
      await runRecognition()

      // Set up continuous recognition
      recognitionIntervalRef.current = setInterval(runRecognition, FRAME_INTERVAL_MS)

      setIsRunning(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setIsRunning(false)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, captureAndRecognize])

  // Stop recognition
  const stop = useCallback(async (): Promise<void> => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current)
      recognitionIntervalRef.current = null
    }

    setIsRunning(false)
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