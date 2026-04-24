/**
 * GestureRecognition Component
 * Main component for SIBI (Sistem Isyarat Bahasa Indonesia) gesture recognition interface
 */

'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useGestureRecognition } from '@/hooks/use-gesture-recognition'
import { Play, Pause, AlertCircle, Hand, RotateCcw, Send } from 'lucide-react'

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

interface GestureRecognitionProps {
  onLetterDetected?: (letter: string, confidence: number) => void
  onWordFormed?: (word: string) => void
  onSendText?: (text: string, confidence: number) => void
  onGestureUpdate?: (gesture: GestureResult) => void
  language?: 'sibi' | 'bisindo'
  className?: string
  showAlternatives?: boolean
  enableWordFormation?: boolean
  maxWordLength?: number
}

export const GestureRecognition: React.FC<GestureRecognitionProps> = ({
  onLetterDetected,
  onWordFormed,
  onSendText,
  onGestureUpdate,
  language: _language = 'sibi',
  className = '',
  showAlternatives: _showAlternatives = true,
  enableWordFormation = true,
  maxWordLength = 50,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [currentWord, setCurrentWord] = useState<string>('')
  const [_detectedLetters, setDetectedLetters] = useState<string[]>([])
  const [_stabilityCount, setStabilityCount] = useState(0)
  const [showCamera, _setShowCamera] = useState(true)
  const [confidence, setConfidence] = useState(0)

  const gestureResultRef = useRef<GestureResult | null>(null)

  const { isInitialized, isRunning, isLoading, error, lastResult, start, stop, initialize } = useGestureRecognition({
    onResult: handleGestureResult,
    onError: (error) => console.error('Gesture recognition error:', error),
    onStatus: (status) => console.log('Status:', status),
  })

  // Initialize camera and canvas
  useEffect(() => {
    if (videoRef.current && canvasRef.current && !isInitialized) {
      const initializeCamera = async () => {
        try {
          await initialize(videoRef.current!, canvasRef.current!)
        } catch (error) {
          console.error('Failed to initialize camera:', error)
        }
      }

      void initializeCamera()
    }
  }, [isInitialized, initialize])

  function handleGestureResult(result: GestureResult): void {
    gestureResultRef.current = result

    if (onGestureUpdate) onGestureUpdate(result)

    setConfidence(result.confidence)

    if (result.validated) {
      addLetterToWord(result.letter)
      setStabilityCount(0)
      if (onLetterDetected) onLetterDetected(result.letter, result.confidence)
    }
  }

  // Add letter to current word
  const addLetterToWord = useCallback(
    (letter: string) => {
      setCurrentWord((prev) => {
        if (prev.length >= maxWordLength) return prev
        const newWord = prev + letter
        setDetectedLetters((p) => [...p, letter])
        if (enableWordFormation && onWordFormed) {
          queueMicrotask(() => onWordFormed(newWord))
        }
        return newWord
      })
    },
    [maxWordLength, enableWordFormation, onWordFormed],
  )

  const clearWord = useCallback(() => {
    setCurrentWord('')
    setDetectedLetters([])
    setStabilityCount(0)
  }, [])

  // Send current word as text
  const sendCurrentWord = useCallback(() => {
    if (currentWord.trim() && onSendText) {
      const avgConfidence = confidence || 0.8 // Use current confidence or default
      onSendText(currentWord.trim(), avgConfidence)
      clearWord() // Clear after sending
    }
  }, [currentWord, confidence, onSendText, clearWord])

  // Remove last letter
  const removeLastLetter = useCallback(() => {
    if (currentWord.length > 0) {
      const newWord = currentWord.slice(0, -1)
      setCurrentWord(newWord)
      setDetectedLetters((prev) => prev.slice(0, -1))

      if (enableWordFormation && onWordFormed) {
        onWordFormed(newWord)
      }
    }
  }, [currentWord, enableWordFormation, onWordFormed])

  useEffect(() => {
    if (canvasRef.current && !canvasCtxRef.current) {
      canvasCtxRef.current = canvasRef.current.getContext('2d')
    }
  }, [])

  useEffect(() => {
    gestureResultRef.current = lastResult
  }, [lastResult])

  useEffect(() => {
    isRunningRef.current = isRunning
    if (!isRunning && canvasCtxRef.current && canvasRef.current) {
      canvasCtxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }, [isRunning])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvasCtxRef.current
    if (!ctx) return

    const drawFrame = () => {
      const _result = gestureResultRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      animationFrameRef.current = requestAnimationFrame(drawFrame)
    }

    animationFrameRef.current = requestAnimationFrame(drawFrame)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Toggle camera start/stop
  const toggleCamera = useCallback(async () => {
    try {
      if (isRunning) {
        stop()
      } else {
        // Re-initialize camera if needed (e.g. after a stop)
        if (!isInitialized && videoRef.current && canvasRef.current) {
          await initialize(videoRef.current, canvasRef.current)
        }
        if (!isInitialized) {
          console.warn('Gesture recognition not yet initialized')
          return
        }
        start()
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error)
    }
  }, [isRunning, isInitialized, initialize, start, stop])

  // Compact UI mode for integration with komunikasi page
  if (className?.includes('compact')) {
    return (
      <div className="relative h-full w-full">
        {/* Camera feed with canvas overlay */}
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-900">
          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: showCamera ? 1 : 0 }}
          />

          {/* Canvas for hand tracking overlay */}
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ display: isRunning ? 'block' : 'none', pointerEvents: 'none' }}
          />

          {/* Initialization/Start screen */}
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                {!isInitialized ? (
                  <>
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mb-2 text-lg font-medium">Memuat TensorFlow.js...</p>
                    <p className="text-sm opacity-75">Sedang mempersiapkan deteksi gesture</p>
                  </>
                ) : isLoading ? (
                  <>
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
                    <p className="mb-2 text-lg font-medium">Memulai Deteksi...</p>
                    <p className="text-sm opacity-75">Sedang mengaktifkan kamera dan AI</p>
                  </>
                ) : (
                  <>
                    <Hand className="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p className="mb-2 text-lg font-medium">Deteksi Gesture SIBI</p>
                    <p className="mb-4 text-sm opacity-75">Menggunakan TensorFlow.js untuk deteksi handpose</p>
                    <Button
                      onClick={() => void toggleCamera()}
                      className="bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                      disabled={!isInitialized || isLoading}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Mulai Deteksi
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/90">
              <div className="text-center text-white">
                <AlertCircle className="mx-auto mb-4 h-12 w-12" />
                <p className="mb-2 text-lg font-medium">Error</p>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          )}

          {/* Controls overlay */}
          {isRunning && (
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <Button onClick={() => void toggleCamera()} size="sm" className="bg-red-600 text-white hover:bg-red-700">
                <Pause className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Detection info overlay */}
          {isRunning && (
            <div className="absolute top-4 left-4 space-y-2">
              {/* Status indicator */}
              <div className="rounded-lg bg-black/50 px-3 py-1 text-sm text-white">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                  <span>YOLO + MediaPipe</span>
                </div>
              </div>

              {/* Enhanced detection info with validation status */}
              {lastResult && (
                <div
                  className={`rounded-lg px-4 py-2 text-white transition-colors ${
                    lastResult.validated ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold">{lastResult.letter}</span>
                    <div className="text-xs">
                      <div>Conf: {Math.round(lastResult.confidence * 100)}%</div>
                      <div className="mt-1 flex items-center gap-1">
                        {lastResult.validated ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-green-400"></div>
                            <span className="text-green-200">Validated</span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"></div>
                            <span className="text-yellow-200">Menunggu...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence progress bar */}
              {isRunning && confidence > 0 && (
                <div className="rounded-lg bg-black/50 px-3 py-2">
                  <div className="mb-1 text-xs text-white">Confidence</div>
                  <Progress value={confidence * 100} className="h-2 bg-gray-600" />
                  <div className="mt-1 flex justify-end text-xs text-gray-300">
                    <span>{Math.round(confidence * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Child-friendly sleek mode (default)
  return (
    <div className={`relative flex h-full w-full flex-col gap-4 ${className}`}>
      {/* Video Container */}
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-inner ring-1 transition-all duration-300 ${
          isRunning ? 'shadow-[0_0_30px_-5px_rgba(52,211,153,0.3)] ring-4 ring-emerald-400' : 'ring-black/5'
        }`}
        style={{ transform: 'translateZ(0)' }} // Fix Safari overflow bug
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full rounded-[2.5rem] object-cover transition-opacity duration-500 ${
            showCamera ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Canvas for hand tracking overlay */}
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          className="absolute inset-0 h-full w-full rounded-[2.5rem] object-cover"
          style={{ display: isRunning ? 'block' : 'none', pointerEvents: 'none' }}
        />

        {/* Initialization/Start screen */}
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[2.5rem] bg-slate-900/5 backdrop-blur-sm">
            <div className="text-center">
              {!isInitialized ? (
                <div className="flex flex-col items-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-sm"></div>
                  <p className="text-lg font-bold text-slate-700">Mempersiapkan Kamera...</p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-sm"></div>
                  <p className="text-lg font-bold text-slate-700">Menyalakan AI...</p>
                </div>
              ) : (
                <div className="animate-in zoom-in flex flex-col items-center gap-4 duration-300">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-900/5">
                    <Hand className="h-10 w-10 text-emerald-500" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">Siap Mendeteksi Isyarat!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRunning && (
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"></div>
            <span className="text-xs font-bold tracking-wider text-white uppercase">Merekam</span>
          </div>
        )}

        {/* Current Letter Feedback (Large & Friendly) */}
        {isRunning && lastResult && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div
              className={`flex items-center justify-center rounded-2xl px-6 py-3 shadow-xl backdrop-blur-md transition-all duration-300 ${
                lastResult.validated ? 'scale-100 bg-emerald-500/90' : 'scale-95 bg-orange-500/90'
              }`}
            >
              <span className="text-4xl font-black text-white">{lastResult.letter}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls and Word Formation Area */}
      <div className="flex flex-col gap-4">
        {/* Play/Pause/Clear Controls */}
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => void toggleCamera()}
            disabled={!isInitialized || isLoading}
            size="lg"
            variant={isRunning ? 'destructive' : 'default'}
            className={`h-14 rounded-full border-none px-8 text-base font-bold shadow-sm transition-transform hover:scale-105 ${
              isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-5 w-5" fill="currentColor" /> Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" fill="currentColor" /> Mulai Kamera
              </>
            )}
          </Button>

          <Button
            onClick={clearWord}
            disabled={currentWord.length === 0}
            size="lg"
            variant="outline"
            className="h-14 w-14 rounded-full border-slate-200 bg-white p-0 shadow-sm transition-colors hover:bg-slate-50 hover:text-red-600"
            title="Hapus Semua Kata"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Word Formation Display */}
        {enableWordFormation && (
          <div className="relative mt-2 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            {/* Background decorative blob */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-50 blur-2xl"></div>

            <div className="relative z-10 flex flex-col items-center">
              <span className="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
                Kata Yang Terbentuk:
              </span>

              <div className="flex min-h-[4rem] w-full items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-black/5">
                {currentWord ? (
                  <span className="text-center text-3xl font-black tracking-tight break-words text-slate-800">
                    {currentWord}
                  </span>
                ) : (
                  <span className="text-base font-medium text-slate-300">Isyaratkan sesuatu...</span>
                )}
              </div>

              {currentWord && (
                <div className="mt-4 flex w-full justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeLastLetter}
                    className="rounded-full bg-white font-medium text-slate-600 shadow-sm hover:text-red-500"
                  >
                    Hapus Huruf
                  </Button>

                  {onSendText && (
                    <Button
                      onClick={sendCurrentWord}
                      size="sm"
                      className="rounded-full border-none bg-emerald-500 font-bold text-white shadow-md hover:bg-emerald-600"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Cari Makna
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="rounded-2xl border-none bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{error.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

export default GestureRecognition
