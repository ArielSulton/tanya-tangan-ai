'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { HandPoseService } from '@/lib/ai/services/handpose-service'
import { sortHandsByXPosition } from '@/lib/gesture/normalize'
import { extractFrameFeatures } from '@/lib/gesture/feature-extractor'
import {
  extractLabelFromPath,
  normalizeImportLabel,
  isValidImportLabel,
} from '@/lib/gesture/recording/label-extraction'
import { computeSampleTimestamps } from '@/lib/gesture/recording/video-frame-sampler'
import { addStatic } from '@/lib/gesture/recording/storage'
import type { StaticSample } from '@/lib/gesture/recording/types'

interface Props {
  /** Shared HandPose service from the parent (reuses the loaded model). */
  handpose: HandPoseService | null
  /** Called whenever new static samples are persisted, so parent can refresh state. */
  onImported: (samples: StaticSample[]) => void
}

interface ParsedFile {
  file: File
  /** Label extracted from filename or subfolder. null = no label match. */
  label: string | null
}

interface ImportStats {
  imported: number
  skipped: number
  skippedNoHands: number
  perClass: Record<string, number>
}

const DEFAULT_INTERVAL_MS = 150
const MIN_INTERVAL_MS = 50
const MAX_INTERVAL_MS = 1000

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Load a File as an offscreen HTMLVideoElement, resolving once metadata (incl. duration) is ready. */
function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('video load failed'))
    }
    video.src = url
    // Caller revokes URL once done. Storing on element for later cleanup.
    ;(video as HTMLVideoElement & { __objectUrl?: string }).__objectUrl = url
  })
}

function releaseVideo(video: HTMLVideoElement): void {
  const url = (video as HTMLVideoElement & { __objectUrl?: string }).__objectUrl
  if (url) URL.revokeObjectURL(url)
}

/** Seek a video to a given timestamp (seconds), resolving once the frame is ready to read. */
function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(new Error('video seek failed'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = t
  })
}

export function VideoImporter({ handpose, onImported }: Props): ReactNode {
  const folderInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'idle' | 'preview' | 'processing' | 'done'>('idle')
  const [parsed, setParsed] = useState<ParsedFile[]>([])
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({})
  const [unlabeledSkipped, setUnlabeledSkipped] = useState(0)
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set())
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [liveStats, setLiveStats] = useState<ImportStats>({ imported: 0, skipped: 0, skippedNoHands: 0, perClass: {} })
  const cancelRef = useRef(false)

  // React strips the non-standard webkitdirectory attribute from JSX. Apply
  // it via setAttribute after mount so the folder picker actually opens in
  // directory mode (otherwise Chrome/Firefox on Linux grey out folders).
  useEffect(() => {
    const el = folderInputRef.current
    if (!el) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
    el.setAttribute('mozdirectory', '')
  }, [])

  function openFolderPicker(): void {
    folderInputRef.current?.click()
  }

  function openFilesPicker(): void {
    filesInputRef.current?.click()
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const rows: ParsedFile[] = files
      .filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f.name))
      .map((f) => ({ file: f, label: extractLabelFromPath(f) }))

    // Bucket by normalized label, count unparseable/invalid ones
    const counts: Record<string, number> = {}
    let unlabeled = 0
    for (const r of rows) {
      if (r.label === null) {
        unlabeled++
        continue
      }
      const norm = normalizeImportLabel(r.label)
      if (!isValidImportLabel(norm)) {
        unlabeled++
        continue
      }
      counts[norm] = (counts[norm] || 0) + 1
    }
    const labels = Object.keys(counts).sort()
    setParsed(rows)
    setLabelCounts(counts)
    setUnlabeledSkipped(unlabeled)
    setSelectedLabels(new Set(labels))
    setStage('preview')
    if (folderInputRef.current) folderInputRef.current.value = ''
    if (filesInputRef.current) filesInputRef.current.value = ''
  }

  function toggleLabel(label: string): void {
    const next = new Set(selectedLabels)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    setSelectedLabels(next)
  }

  async function startImport(): Promise<void> {
    if (!handpose) {
      alert('HandPose belum siap. Tunggu sebentar.')
      return
    }
    const queue: { file: File; label: string }[] = []
    for (const r of parsed) {
      if (r.label === null) continue
      const norm = normalizeImportLabel(r.label)
      if (!isValidImportLabel(norm)) continue
      if (!selectedLabels.has(norm)) continue
      queue.push({ file: r.file, label: norm })
    }
    if (queue.length === 0) {
      alert('Tidak ada file yang dipilih.')
      return
    }
    cancelRef.current = false
    setStage('processing')
    setProgress({ done: 0, total: queue.length })
    setLiveStats({ imported: 0, skipped: 0, skippedNoHands: 0, perClass: {} })

    const newSamples: StaticSample[] = []
    let imported = 0
    let skippedNoHands = 0
    let skipped = 0
    const perClass: Record<string, number> = {}

    for (let i = 0; i < queue.length; i++) {
      if (cancelRef.current) break
      const item = queue[i]
      let video: HTMLVideoElement | null = null
      try {
        video = await loadVideo(item.file)
        const timestamps = computeSampleTimestamps(video.duration, intervalMs)
        for (const t of timestamps) {
          await seekTo(video, t)
          const raws = await handpose.detectRawHands(video)
          if (raws.length === 0) {
            skippedNoHands++
          } else {
            const pair = sortHandsByXPosition(raws)
            const features = extractFrameFeatures(pair)
            const allZero = features.every((v) => v === 0)
            if (allZero) {
              skippedNoHands++
            } else {
              const sample: StaticSample = {
                id: genId(),
                label: item.label,
                features,
                capturedAt: Date.now(),
                source: 'manual',
              }
              await addStatic(sample)
              newSamples.push(sample)
              imported++
              perClass[item.label] = (perClass[item.label] || 0) + 1
            }
          }
          setLiveStats({ imported, skipped, skippedNoHands, perClass: { ...perClass } })
          // Yield to event loop after each frame so the UI stays responsive
          // during a single long video's processing.
          await new Promise((r) => setTimeout(r, 0))
        }
      } catch (err) {
        skipped++
        console.warn(`[video-importer] ${item.file.name} skipped:`, err)
      } finally {
        if (video) releaseVideo(video)
      }
      setProgress({ done: i + 1, total: queue.length })
      // Flush stats after every video too, not just every frame — a video
      // that fails in loadVideo/seekTo increments `skipped` in the catch
      // above, outside the frame loop's setLiveStats call, so without this
      // the done screen can under-report errors if the last video(s) fail.
      setLiveStats({ imported, skipped, skippedNoHands, perClass: { ...perClass } })
    }

    if (newSamples.length > 0) onImported(newSamples)
    setStage('done')
  }

  // Note: intervalMs is intentionally NOT reset here — a user who dials in
  // a interval for their recording setup expects it to persist across
  // consecutive import batches, not snap back to the default each time.
  function reset(): void {
    setStage('idle')
    setParsed([])
    setLabelCounts({})
    setUnlabeledSkipped(0)
    setSelectedLabels(new Set())
    setProgress({ done: 0, total: 0 })
    setLiveStats({ imported: 0, skipped: 0, skippedNoHands: 0, perClass: {} })
  }

  const validLabels = Object.keys(labelCounts).sort()
  const totalSelected = validLabels.reduce((sum, l) => (selectedLabels.has(l) ? sum + labelCounts[l] : sum), 0)
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <button
        type="button"
        onClick={openFolderPicker}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        disabled={!handpose || stage === 'processing'}
        title="Import video dari folder (subfolder name = label, atau filename pattern)"
      >
        Import video
      </button>
      {/* Folder picker — webkitdirectory attribute applied via ref (React strips it from JSX). */}
      <input ref={folderInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />
      {/* Multi-file picker — fallback for browsers/OS where folder picker is grey/disabled. */}
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <button
        type="button"
        onClick={openFilesPicker}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        disabled={!handpose || stage === 'processing'}
        title="Import multiple video files (label dari filename pattern)"
      >
        Import video files
      </button>

      {stage === 'preview' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">Video import preview</h2>
              <p className="mt-1 text-xs text-slate-500">
                Tiap video akan diekstrak jadi banyak sample statis (satu per frame yang di-sample). Label diambil dari
                nama folder/filename, sama seperti import gambar.
              </p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-4 py-3 text-sm">
              {validLabels.length === 0 ? (
                <p className="text-slate-500">
                  Tidak ada video dengan label valid.{' '}
                  {unlabeledSkipped > 0 && `${unlabeledSkipped} video di-skip karena tidak ada label valid.`}
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-slate-600">
                    {parsed.length} video total &middot; {validLabels.length} kelas valid
                    {unlabeledSkipped > 0 && ` · ${unlabeledSkipped} di-skip (tidak ada label valid)`}
                  </p>
                  <ul className="divide-y divide-slate-100">
                    {validLabels.map((label) => (
                      <li key={label} className="flex items-center justify-between py-1.5">
                        <label className="flex flex-1 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLabels.has(label)}
                            onChange={() => toggleLabel(label)}
                          />
                          <span className="font-mono text-sm">{label}</span>
                        </label>
                        <span className="text-xs text-slate-500">{labelCounts[label]} video</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void startImport()}
                  disabled={totalSelected === 0}
                  className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Import {totalSelected} video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">Importing…</h2>
              <p className="mt-1 text-xs text-slate-500">
                {progress.done} / {progress.total} video processed
              </p>
            </div>
            <div className="px-4 py-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-emerald-50 p-2">
                  <div className="font-mono text-base font-semibold text-emerald-700">{liveStats.imported}</div>
                  <div className="text-emerald-600">imported</div>
                </div>
                <div className="rounded bg-amber-50 p-2">
                  <div className="font-mono text-base font-semibold text-amber-700">{liveStats.skippedNoHands}</div>
                  <div className="text-amber-600">no hands</div>
                </div>
                <div className="rounded bg-rose-50 p-2">
                  <div className="font-mono text-base font-semibold text-rose-700">{liveStats.skipped}</div>
                  <div className="text-rose-600">error</div>
                </div>
              </div>
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => {
                    cancelRef.current = true
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Cancel after current video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">Import complete</h2>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-4 py-3 text-sm">
              <p>
                <b>{liveStats.imported}</b> sample imported · <b>{liveStats.skippedNoHands}</b> tidak ada tangan ·{' '}
                <b>{liveStats.skipped}</b> error
              </p>
              {Object.keys(liveStats.perClass).length > 0 && (
                <>
                  <p className="mt-3 text-xs font-semibold text-slate-500 uppercase">Per kelas</p>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {Object.keys(liveStats.perClass)
                      .sort()
                      .map((label) => (
                        <li key={label} className="flex justify-between py-1 text-xs">
                          <span className="font-mono">{label}</span>
                          <span className="text-slate-500">{liveStats.perClass[label]}</span>
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
