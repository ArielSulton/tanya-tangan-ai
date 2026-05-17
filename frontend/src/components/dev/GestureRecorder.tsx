'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClassPicker } from './ClassPicker'
import { RecordingControls } from './RecordingControls'
import { SampleList } from './SampleList'
import { HandPoseService } from '@/lib/ai/services/handpose-service'
import { sortHandsByXPosition } from '@/lib/gesture/normalize'
import { captureStaticSample } from '@/lib/gesture/recording/keypoint-recorder'
import { PointHistoryRecorder } from '@/lib/gesture/recording/point-history-recorder'
import { staticSamplesToCsv, dynamicSamplesToCsv } from '@/lib/gesture/recording/csv-export'
import {
  addStatic,
  addDynamic,
  listStatic,
  listDynamic,
  deleteStatic,
  deleteDynamic,
  deleteStaticByLabel,
  deleteDynamicByLabel,
  clearStatic as clearStaticStorage,
  clearDynamic as clearDynamicStorage,
  clearAll as clearAllStorage,
} from '@/lib/gesture/recording/storage'
import { labelFrameViaYolo } from '@/lib/gesture/recording/yolo-labeler'
import {
  STATIC_CLASSES,
  DYNAMIC_CLASS_SUGGESTIONS,
  type StaticSample,
  type DynamicSample,
} from '@/lib/gesture/recording/types'
import { DynamicClassInput } from './DynamicClassInput'
import { ImageImporter } from './ImageImporter'

const AUTO_LABEL_INTERVAL_MS = 600 // throttle YOLO calls so we don't flood backend

// Hand landmark connectivity (MediaPipe indices) — same skeleton vocab uses.
const FINGER_CHAINS: ReadonlyArray<readonly number[]> = [
  [0, 1, 2, 3, 4], // thumb
  [0, 5, 6, 7, 8], // index
  [0, 9, 10, 11, 12], // middle
  [0, 13, 14, 15, 16], // ring
  [0, 17, 18, 19, 20], // pinky
]

interface LandmarkPoint {
  x: number
  y: number
}

function drawSkeleton(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement,
  hands: ReadonlyArray<{ landmarks: LandmarkPoint[] }>,
): void {
  if (!canvas) return
  // Sync canvas backing-store to video native resolution so landmark pixel
  // coords (already in video pixel space from mediapipe) line up.
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const hand of hands) {
    const lm = hand.landmarks
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    for (const chain of FINGER_CHAINS) {
      ctx.beginPath()
      for (let i = 0; i < chain.length; i++) {
        const p = lm[chain[i]]
        if (!p) continue
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i]
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = i < 4 ? '#ff3030' : '#3070ff'
      ctx.fill()
    }
  }
}

export function GestureRecorder() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handposeRef = useRef<HandPoseService | null>(null)
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `rec-${Date.now()}`,
  )
  const rafRef = useRef<number | null>(null)
  const lastAutoLabelTsRef = useRef(0)
  const recorderRef = useRef<PointHistoryRecorder>(new PointHistoryRecorder())

  const [mode, setMode] = useState<'static' | 'dynamic'>('static')
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [autoLabel, setAutoLabel] = useState(false)
  // Dynamic buffer progress reported in ms (wall-clock duration of recorder
  // buffer). UI shows "X.XXs / 1.50s" so user knows when buffer is ready
  // regardless of the host laptop's frame rate.
  const [bufferDurationMs, setBufferDurationMs] = useState(0)
  const [staticSamples, setStaticSamples] = useState<StaticSample[]>([])
  const [dynamicSamples, setDynamicSamples] = useState<DynamicSample[]>([])
  const [status, setStatus] = useState('Initialising…')
  const [latestPair, setLatestPair] = useState<ReturnType<typeof sortHandsByXPosition> | null>(null)
  // Delay (seconds) between pressing Record/Space and actually capturing the
  // sample. Lets user position both hands or settle the pose before snapshot.
  // 0 = capture immediately.
  const [recordDelaySec, setRecordDelaySec] = useState(5)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs mirror state so the long-lived rAF pump can read live values
  // without having useEffect re-mount the camera each time.
  const modeRef = useRef(mode)
  modeRef.current = mode
  const activeClassRef = useRef(activeClass)
  activeClassRef.current = activeClass
  const autoLabelRef = useRef(autoLabel)
  autoLabelRef.current = autoLabel

  // Re-load from IndexedDB on mount.
  useEffect(() => {
    void (async () => {
      try {
        const [s, d] = await Promise.all([listStatic(), listDynamic()])
        setStaticSamples(s)
        setDynamicSamples(d)
      } catch (e) {
        console.warn('[recorder] load failed:', e)
      }
    })()
  }, [])

  // Camera + handpose setup.
  useEffect(() => {
    let cancelled = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) return reject(new Error('no video element'))
          videoRef.current.onloadedmetadata = () => resolve()
          videoRef.current.onerror = () => reject(new Error('video element error'))
        })
        await videoRef.current.play()

        const hp = new HandPoseService({ maxNumHands: 2 })
        await hp.initialize()
        if (cancelled) {
          hp.dispose()
          return
        }
        handposeRef.current = hp
        setStatus('Ready')
        startPump()
      } catch (e) {
        setStatus(`Init failed: ${(e as Error).message}`)
      }
    }

    const startPump = () => {
      const tick = async () => {
        if (cancelled) return
        const hp = handposeRef.current
        const video = videoRef.current
        if (hp && video && video.readyState >= 2) {
          try {
            const raws = await hp.detectRawHands(video)
            const pair = sortHandsByXPosition(raws)
            setLatestPair(pair)
            drawSkeleton(canvasRef.current, video, raws)
            // Push wrist of leftmost hand to dynamic recorder. Normalize to
            // [0,1] by dividing by video dimensions — matches the production
            // engine + standalone recorder so a single trained dynamic model
            // works regardless of which UI collected the data.
            if (raws.length > 0) {
              const vw = video.videoWidth || 1
              const vh = video.videoHeight || 1
              recorderRef.current.push({
                x: raws[0].landmarks[0].x / vw,
                y: raws[0].landmarks[0].y / vh,
              })
            } else {
              recorderRef.current.push(null)
            }
            setBufferDurationMs(recorderRef.current.durationMs)
            // Auto-label tick (throttled). Read live values from refs so this
            // pump doesn't have to re-mount on every interaction.
            const currentMode = modeRef.current
            const currentClass = activeClassRef.current
            const currentAuto = autoLabelRef.current
            if (currentAuto && currentClass && currentMode === 'static') {
              const now = Date.now()
              if (now - lastAutoLabelTsRef.current >= AUTO_LABEL_INTERVAL_MS) {
                lastAutoLabelTsRef.current = now
                const res = await labelFrameViaYolo(video, sessionIdRef.current)
                if (res && res.letter === currentClass) {
                  const sample = captureStaticSample(pair, currentClass, 'yolo-auto')
                  await addStatic(sample)
                  setStaticSamples((prev) => [...prev, sample])
                }
              }
            }
          } catch {
            // skip frame on error
          }
        }
        rafRef.current = requestAnimationFrame(() => void tick())
      }
      rafRef.current = requestAnimationFrame(() => void tick())
    }

    void start()

    // Snapshot the <video> ref so cleanup stops the stream on the same DOM
    // node we attached it to, even if React swaps the element later.
    const videoElForCleanup = videoRef.current
    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      handposeRef.current?.dispose()
      handposeRef.current = null
      const stream = videoElForCleanup?.srcObject as MediaStream | null
      stream?.getTracks().forEach((t) => t.stop())
    }
    // Empty deps: camera + handpose set up once. Live state read via refs above.
  }, [])

  // Hotkey: Space → record sample (static) or save take (dynamic).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space') return
      const target = ev.target as HTMLElement | null
      const tag = target?.tagName ?? ''
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || target?.isContentEditable) return
      ev.preventDefault()
      if (mode === 'static') void handleRecordStatic()
      else void handleSaveDynamicTake()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeClass, latestPair])

  const captureStaticNow = useCallback(async () => {
    if (!activeClass) return
    // Snapshot the latest pair at capture time, not at trigger time — gives
    // the countdown window a chance to settle / for the user to position.
    const pair = latestPair
    if (!pair) return
    const sample = captureStaticSample(pair, activeClass, 'manual')
    try {
      await addStatic(sample)
      setStaticSamples((prev) => [...prev, sample])
    } catch (e) {
      console.error('[recorder] addStatic failed:', e)
    }
  }, [activeClass, latestPair])

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdown(null)
  }, [])

  const handleRecordStatic = useCallback(async () => {
    if (!activeClass || !latestPair) return
    // Already counting? Treat second press as cancel.
    if (countdown !== null) {
      cancelCountdown()
      return
    }
    if (recordDelaySec <= 0) {
      await captureStaticNow()
      return
    }
    // Start countdown. Tick every second; capture at 0.
    setCountdown(recordDelaySec)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null
        if (c <= 1) {
          if (countdownIntervalRef.current !== null) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          // Capture on next microtask so the "0" state renders briefly.
          void captureStaticNow()
          return null
        }
        return c - 1
      })
    }, 1000)
  }, [activeClass, latestPair, countdown, recordDelaySec, captureStaticNow, cancelCountdown])

  // Make sure countdown cleans up if component unmounts.
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current !== null) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  const handleSaveDynamicTake = useCallback(async () => {
    if (!activeClass) return
    try {
      const sample = recorderRef.current.takeSample(activeClass)
      await addDynamic(sample)
      setDynamicSamples((prev) => [...prev, sample])
      recorderRef.current.reset()
      setBufferDurationMs(0)
    } catch (e) {
      console.warn('[recorder] takeSample failed:', e)
    }
  }, [activeClass])

  const handleResetBuffer = useCallback(() => {
    recorderRef.current.reset()
    setBufferDurationMs(0)
  }, [])

  const handleExportCsv = useCallback(() => {
    const staticCsv = staticSamplesToCsv(staticSamples)
    const dynamicCsv = dynamicSamplesToCsv(dynamicSamples)
    download(staticCsv, 'keypoint.csv')
    download(dynamicCsv, 'point_history.csv')
  }, [staticSamples, dynamicSamples])

  const handleClearAll = useCallback(async () => {
    if (!confirm('Delete ALL recorded samples? This cannot be undone.')) return
    await clearAllStorage()
    setStaticSamples([])
    setDynamicSamples([])
  }, [])

  const handleClearStatic = useCallback(async () => {
    if (!confirm('Delete all STATIC samples? This cannot be undone.')) return
    await clearStaticStorage()
    setStaticSamples([])
  }, [])

  const handleClearDynamic = useCallback(async () => {
    if (!confirm('Delete all DYNAMIC samples? This cannot be undone.')) return
    await clearDynamicStorage()
    setDynamicSamples([])
  }, [])

  const handleDeleteStaticClass = useCallback(async (label: string) => {
    if (!confirm(`Hapus semua sample static kelas "${label}"? Tidak bisa di-undo.`)) return
    await deleteStaticByLabel(label)
    setStaticSamples((prev) => prev.filter((s) => s.label !== label))
  }, [])

  const handleDeleteDynamicClass = useCallback(async (label: string) => {
    if (!confirm(`Hapus semua sample dynamic kelas "${label}"? Tidak bisa di-undo.`)) return
    await deleteDynamicByLabel(label)
    setDynamicSamples((prev) => prev.filter((s) => s.label !== label))
  }, [])

  const handleDeleteStatic = useCallback(async (id: string) => {
    await deleteStatic(id)
    setStaticSamples((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleDeleteDynamic = useCallback(async (id: string) => {
    await deleteDynamic(id)
    setDynamicSamples((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const staticCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of staticSamples) c[s.label] = (c[s.label] ?? 0) + 1
    return c
  }, [staticSamples])
  // Counts limited to non-alphabet (custom) static labels — feeds the
  // typeable input next to the A-Y picker. Empty when only standard
  // alphabet letters have been recorded.
  const staticCustomCounts = useMemo(() => {
    const alphabet = new Set<string>(STATIC_CLASSES)
    const c: Record<string, number> = {}
    for (const s of staticSamples) {
      if (alphabet.has(s.label)) continue
      c[s.label] = (c[s.label] ?? 0) + 1
    }
    return c
  }, [staticSamples])
  const dynamicCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of dynamicSamples) c[s.label] = (c[s.label] ?? 0) + 1
    return c
  }, [dynamicSamples])

  // Highlight the active class in the right component: letter picker if it
  // matches A-Y, custom input otherwise.
  const isAlphabetActive = activeClass !== null && (STATIC_CLASSES as readonly string[]).includes(activeClass)

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-4 p-4 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col lg:col-span-7">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2.5rem] bg-slate-50 p-2 shadow-inner ring-1 ring-black/5">
          <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            {countdown !== null && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="font-mono text-[14rem] font-bold leading-none text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-600">{status}</div>
        <div className="mt-4">
          <RecordingControls
            mode={mode}
            onModeChange={setMode}
            onRecordStatic={() => void handleRecordStatic()}
            staticAutoLabel={autoLabel}
            onToggleAutoLabel={() => setAutoLabel((v) => !v)}
            dynamicBufferDurationMs={bufferDurationMs}
            onSaveDynamicTake={() => void handleSaveDynamicTake()}
            onResetDynamicBuffer={handleResetBuffer}
            onExportCsv={handleExportCsv}
            onClearAll={() => void handleClearAll()}
            classSelected={activeClass !== null}
          />
          {mode === 'static' && (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <label className="flex items-center gap-1.5">
                  Delay
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={recordDelaySec}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10)
                      if (!Number.isNaN(v)) setRecordDelaySec(Math.max(0, Math.min(30, v)))
                    }}
                    className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-center font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    aria-label="Recording delay in seconds"
                    disabled={countdown !== null}
                  />
                  detik
                </label>
                <span className="text-slate-500">— countdown sebelum capture (0 = langsung). Press Space lagi untuk cancel.</span>
                {countdown !== null && (
                  <button
                    type="button"
                    onClick={cancelCountdown}
                    className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    Cancel ({countdown}s)
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <ImageImporter
                  handpose={handposeRef.current}
                  onImported={(samples) => setStaticSamples((prev) => [...prev, ...samples])}
                />
                <span>Bulk-label dari folder (subfolder/filename pattern). Static only.</span>
              </div>
            </>
          )}
        </div>
        <div className="mt-4">
          {mode === 'static' ? (
            <>
              <div className="mb-1 text-xs font-semibold text-slate-500 uppercase">Alphabet class</div>
              <ClassPicker
                classes={STATIC_CLASSES}
                active={isAlphabetActive ? activeClass : null}
                onSelect={setActiveClass}
                counts={staticCounts}
              />
              <div className="mb-1 mt-3 text-xs font-semibold text-slate-500 uppercase">Or custom static class</div>
              <DynamicClassInput
                active={!isAlphabetActive ? activeClass : null}
                onSelect={setActiveClass}
                suggestions={[]}
                counts={staticCustomCounts}
              />
            </>
          ) : (
            <>
              <div className="mb-1 text-xs font-semibold text-slate-500 uppercase">Dynamic class</div>
              <DynamicClassInput
                active={activeClass}
                onSelect={setActiveClass}
                suggestions={DYNAMIC_CLASS_SUGGESTIONS}
                counts={dynamicCounts}
              />
            </>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
        <SampleList
          title="Static samples"
          samples={staticSamples}
          onDelete={(id) => void handleDeleteStatic(id)}
          onClear={() => void handleClearStatic()}
          onDeleteClass={(label) => void handleDeleteStaticClass(label)}
        />
        <SampleList
          title="Dynamic samples"
          samples={dynamicSamples}
          onDelete={(id) => void handleDeleteDynamic(id)}
          onClear={() => void handleClearDynamic()}
          onDeleteClass={(label) => void handleDeleteDynamicClass(label)}
        />
      </div>
    </div>
  )
}

function download(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
