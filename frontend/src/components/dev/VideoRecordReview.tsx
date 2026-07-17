'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HandPoseService } from '@/lib/ai/services/handpose-service'
import { loadVideo, releaseVideo, seekTo } from '@/lib/gesture/recording/video-element'
import { computeSampleTimestamps } from '@/lib/gesture/recording/video-frame-sampler'
import { extractStaticSampleFromVideoFrame } from '@/lib/gesture/recording/frame-sample-extractor'
import { addStatic } from '@/lib/gesture/recording/storage'
import type { StaticSample } from '@/lib/gesture/recording/types'

interface Props {
  /** Camera stream GestureRecorder already owns and is running live detection
   *  against — this component must never call getUserMedia itself, and must
   *  never call .stop() on this stream's tracks (only the MediaRecorder
   *  instance gets stopped; stopping the stream's tracks would kill the live
   *  camera feed for the whole page). */
  stream: MediaStream | null
  activeClass: string
  handpose: HandPoseService | null
  onImported: (samples: StaticSample[]) => void
  onClose: () => void
}

type Stage = 'idle' | 'recording' | 'reviewing' | 'done'
type FrameOutcome = 'accepted' | 'skipped' | null

const DEFAULT_INTERVAL_MS = 150
const MIN_INTERVAL_MS = 50
const MAX_INTERVAL_MS = 1000

function pickMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export function VideoRecordReview({ stream, activeClass, handpose, onImported, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isAcceptingRef = useRef(false)

  const [reviewVideo, setReviewVideo] = useState<HTMLVideoElement | null>(null)
  const [timestamps, setTimestamps] = useState<number[]>([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [frameOutcomes, setFrameOutcomes] = useState<FrameOutcome[]>([])
  const [pendingSample, setPendingSample] = useState<StaticSample | null | 'loading'>('loading')

  // Bind the reused camera stream to the preview <video> for both idle
  // (framing check) and recording stages. Re-runs on every stage change
  // because idle and recording each mount their own <video> element (React
  // unmounts/remounts across the stage switch, detaching the ref) — stream
  // alone as a dep wouldn't catch that since the stream itself never changes.
  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream
    }
  }, [stream, stage])

  const acceptedCount = frameOutcomes.filter((o) => o === 'accepted').length
  const skippedCount = frameOutcomes.filter((o) => o === 'skipped').length

  const advance = useCallback(() => {
    setFrameIndex((i) => {
      const next = i + 1
      if (next >= timestamps.length) setStage('done')
      return next
    })
  }, [timestamps.length])

  const handleAccept = useCallback(async () => {
    if (pendingSample === 'loading' || pendingSample === null) return
    if (isAcceptingRef.current) return
    isAcceptingRef.current = true
    try {
      await addStatic(pendingSample)
      onImported([pendingSample])
      setFrameOutcomes((prev) => {
        const next = [...prev]
        next[frameIndex] = 'accepted'
        return next
      })
      advance()
    } finally {
      isAcceptingRef.current = false
    }
  }, [pendingSample, advance, onImported, frameIndex])

  const handleSkip = useCallback(() => {
    setFrameOutcomes((prev) => {
      const next = [...prev]
      next[frameIndex] = 'skipped'
      return next
    })
    advance()
  }, [advance, frameIndex])

  // Seek + detect the current candidate frame whenever it changes.
  useEffect(() => {
    if (stage !== 'reviewing' || !reviewVideo || !handpose) return
    if (frameIndex >= timestamps.length) return
    let cancelled = false
    setPendingSample('loading')
    void (async () => {
      await seekTo(reviewVideo, timestamps[frameIndex])
      const sample = await extractStaticSampleFromVideoFrame(reviewVideo, handpose, activeClass)
      if (!cancelled) setPendingSample(sample)
    })()
    return () => {
      cancelled = true
    }
  }, [stage, reviewVideo, frameIndex, timestamps, handpose, activeClass])

  // Space = accept, Backspace = skip. Only listens while actively reviewing —
  // GestureRecorder's own global Space handler is guarded by recordReviewOpen
  // (Task 4) so the two never fire on the same keypress.
  useEffect(() => {
    if (stage !== 'reviewing') return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        ev.preventDefault()
        void handleAccept()
      } else if (ev.code === 'Backspace') {
        ev.preventDefault()
        handleSkip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, handleAccept, handleSkip])

  function startRecording(): void {
    if (!stream) return
    chunksRef.current = []
    const mimeType = pickMimeType()
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      void handleRecordingStopped()
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setStage('recording')
  }

  function stopRecording(): void {
    mediaRecorderRef.current?.stop()
  }

  async function handleRecordingStopped(): Promise<void> {
    const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' })
    chunksRef.current = []
    const video = await loadVideo(blob)
    const ts = computeSampleTimestamps(video.duration, intervalMs)
    setReviewVideo(video)
    setTimestamps(ts)
    setFrameOutcomes(ts.map(() => null))
    setFrameIndex(0)
    if (ts.length === 0) {
      releaseVideo(video)
      setStage('done')
      return
    }
    setStage('reviewing')
  }

  const handleClose = useCallback(() => {
    if (reviewVideo) releaseVideo(reviewVideo)
    onClose()
  }, [reviewVideo, onClose])

  return (
    <>
      {stage === 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">Rekam video kelas {activeClass}</h2>
            </div>
            <div className="px-4 py-3">
              <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full rounded-md bg-slate-900" />
              <label className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                Interval
                <input
                  type="number"
                  min={MIN_INTERVAL_MS}
                  max={MAX_INTERVAL_MS}
                  step={10}
                  value={intervalMs}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10)
                    if (!Number.isNaN(v)) setIntervalMs(Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, v)))
                  }}
                  className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-center font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  aria-label="Sampling interval in milliseconds"
                />
                ms
              </label>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={startRecording}
                disabled={!stream}
                className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Mulai rekam
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'recording' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                Merekam kelas {activeClass}
              </h2>
            </div>
            <div className="px-4 py-3">
              <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full rounded-md bg-slate-900" />
            </div>
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-md border border-red-500 bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'reviewing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">
                Kelas {activeClass} &middot; Frame {frameIndex + 1} / {timestamps.length}
              </h2>
            </div>
            <div className="px-4 py-3">
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-900 text-sm text-slate-300">
                {pendingSample === 'loading'
                  ? 'Memeriksa frame…'
                  : pendingSample === null
                    ? 'Tidak ada tangan terdeteksi'
                    : 'Tangan terdeteksi'}
              </div>
              <div className="mt-3 flex gap-1">
                {timestamps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      frameOutcomes[i] === 'accepted'
                        ? 'bg-emerald-400'
                        : frameOutcomes[i] === 'skipped'
                          ? 'bg-red-400'
                          : i === frameIndex
                            ? 'bg-amber-400'
                            : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  ⌫ Skip (Backspace)
                </button>
                <button
                  type="button"
                  onClick={() => void handleAccept()}
                  disabled={pendingSample === 'loading' || pendingSample === null}
                  className="flex-1 rounded-md border border-emerald-500 bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  ✓ Terima (Space)
                </button>
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{acceptedCount} diterima</span>
                <span>{skippedCount} di-skip</span>
                <span>{timestamps.length - frameIndex} tersisa</span>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">Review selesai</h2>
            </div>
            <div className="px-4 py-3 text-sm">
              <p>
                <b>{acceptedCount}</b> sample diterima untuk kelas <b>{activeClass}</b> &middot; <b>{skippedCount}</b>{' '}
                di-skip
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
