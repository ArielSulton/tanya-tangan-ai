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
  clearAll as clearAllStorage,
} from '@/lib/gesture/recording/storage'
import { labelFrameViaYolo } from '@/lib/gesture/recording/yolo-labeler'
import { STATIC_CLASSES, DYNAMIC_CLASSES, type StaticSample, type DynamicSample } from '@/lib/gesture/recording/types'

const AUTO_LABEL_INTERVAL_MS = 600 // throttle YOLO calls so we don't flood backend

export function GestureRecorder() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
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
  const [bufferSize, setBufferSize] = useState(0)
  const [staticSamples, setStaticSamples] = useState<StaticSample[]>([])
  const [dynamicSamples, setDynamicSamples] = useState<DynamicSample[]>([])
  const [status, setStatus] = useState('Initialising…')
  const [latestPair, setLatestPair] = useState<ReturnType<typeof sortHandsByXPosition> | null>(null)

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
            if (raws.length > 0) {
              recorderRef.current.push({
                x: raws[0].landmarks[0].x,
                y: raws[0].landmarks[0].y,
              })
            } else {
              recorderRef.current.push(null)
            }
            setBufferSize(recorderRef.current.size)
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

  const handleRecordStatic = useCallback(async () => {
    if (!activeClass || !latestPair) return
    const sample = captureStaticSample(latestPair, activeClass, 'manual')
    try {
      await addStatic(sample)
      setStaticSamples((prev) => [...prev, sample])
    } catch (e) {
      console.error('[recorder] addStatic failed:', e)
    }
  }, [activeClass, latestPair])

  const handleSaveDynamicTake = useCallback(async () => {
    if (!activeClass) return
    try {
      const sample = recorderRef.current.takeSample(activeClass)
      await addDynamic(sample)
      setDynamicSamples((prev) => [...prev, sample])
      recorderRef.current.reset()
      setBufferSize(0)
    } catch (e) {
      console.warn('[recorder] takeSample failed:', e)
    }
  }, [activeClass])

  const handleResetBuffer = useCallback(() => {
    recorderRef.current.reset()
    setBufferSize(0)
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
  const dynamicCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of dynamicSamples) c[s.label] = (c[s.label] ?? 0) + 1
    return c
  }, [dynamicSamples])

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      <div className="col-span-7">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-slate-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-600">{status}</div>
        <div className="mt-4">
          <RecordingControls
            mode={mode}
            onModeChange={setMode}
            onRecordStatic={() => void handleRecordStatic()}
            staticAutoLabel={autoLabel}
            onToggleAutoLabel={() => setAutoLabel((v) => !v)}
            dynamicBufferSize={bufferSize}
            onSaveDynamicTake={() => void handleSaveDynamicTake()}
            onResetDynamicBuffer={handleResetBuffer}
            onExportCsv={handleExportCsv}
            onClearAll={() => void handleClearAll()}
            classSelected={activeClass !== null}
          />
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-slate-500 uppercase">
            {mode === 'static' ? 'Alphabet class' : 'Dynamic class'}
          </div>
          <ClassPicker
            classes={mode === 'static' ? STATIC_CLASSES : DYNAMIC_CLASSES}
            active={activeClass}
            onSelect={setActiveClass}
            counts={mode === 'static' ? staticCounts : dynamicCounts}
          />
        </div>
      </div>
      <div className="col-span-5 grid grid-rows-2 gap-4">
        <SampleList title="Static samples" samples={staticSamples} onDelete={(id) => void handleDeleteStatic(id)} />
        <SampleList title="Dynamic samples" samples={dynamicSamples} onDelete={(id) => void handleDeleteDynamic(id)} />
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
