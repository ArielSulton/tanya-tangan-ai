'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { HandPoseService } from '@/lib/ai/services/handpose-service'
import { sortHandsByXPosition } from '@/lib/gesture/normalize'
import { extractFrameFeatures } from '@/lib/gesture/feature-extractor'
import { addStatic } from '@/lib/gesture/recording/storage'
import { STATIC_CLASSES, type StaticSample } from '@/lib/gesture/recording/types'

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

const STATIC_CLASS_SET = new Set<string>(STATIC_CLASSES)
const CHUNK_SIZE = 10

/**
 * Extract a label from either a subfolder name (preferred) or filename pattern.
 * Subfolder name takes precedence if present. Filename pattern strips trailing
 * digits before underscore + sequence number: "A_19.jpg" → "A",
 * "Besar1_05.jpg" → "Besar", "A2_09.jpg" → "A", "frame_00129.jpg" → "frame".
 * Returns null if no pattern matched.
 */
function extractLabel(file: File & { webkitRelativePath?: string }): string | null {
  const relPath = file.webkitRelativePath || ''
  const parts = relPath.split('/')
  // [rootFolder, ...subfolders, filename]. If subfolder exists, use it.
  if (parts.length >= 3) {
    const subfolder = parts[parts.length - 2]
    if (subfolder) return subfolder
  }
  // Else parse filename
  const name = file.name.replace(/\.[^/.]+$/, '')
  const m = name.match(/^([A-Za-z]+?)\d*_\d+$/)
  return m ? m[1] : null
}

/** Static accepts only single uppercase letters in STATIC_CLASSES. */
function isValidStaticLabel(label: string): boolean {
  return (
    STATIC_CLASS_SET.has(label.toUpperCase()) && STATIC_CLASS_SET.has(label.toUpperCase()) && /^[A-Za-z]$/.test(label)
  ) // exactly one alphabetic char
}

function normalizeStaticLabel(label: string): string {
  return label.toUpperCase()
}

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Load a File as an HTMLImageElement, resolving when decode is complete. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
    // Caller revokes URL once done. Storing on element for later cleanup.
    ;(img as HTMLImageElement & { __objectUrl?: string }).__objectUrl = url
  })
}

function releaseImage(img: HTMLImageElement): void {
  const url = (img as HTMLImageElement & { __objectUrl?: string }).__objectUrl
  if (url) URL.revokeObjectURL(url)
}

export function ImageImporter({ handpose, onImported }: Props): ReactNode {
  const folderInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'idle' | 'preview' | 'processing' | 'done'>('idle')
  const [parsed, setParsed] = useState<ParsedFile[]>([])
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>({})
  const [nonLetterSkipped, setNonLetterSkipped] = useState(0)
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set())
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
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const rows: ParsedFile[] = files
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
      .map((f) => ({ file: f, label: extractLabel(f) }))

    // Bucket by label, filter non-letter
    const counts: Record<string, number> = {}
    let nonLetter = 0
    for (const r of rows) {
      if (r.label === null) {
        nonLetter++
        continue
      }
      if (!isValidStaticLabel(r.label)) {
        nonLetter++
        continue
      }
      const norm = normalizeStaticLabel(r.label)
      counts[norm] = (counts[norm] || 0) + 1
    }
    const labels = Object.keys(counts).sort()
    setParsed(rows)
    setLabelCounts(counts)
    setNonLetterSkipped(nonLetter)
    setSelectedLabels(new Set(labels))
    setStage('preview')
    // Reset both inputs so re-selecting the same folder/files fires onChange again
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
    // Filter to selected, valid, labeled rows
    const queue: { file: File; label: string }[] = []
    for (const r of parsed) {
      if (r.label === null) continue
      if (!isValidStaticLabel(r.label)) continue
      const norm = normalizeStaticLabel(r.label)
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

    const sessionId = genId()
    const newSamples: StaticSample[] = []
    let imported = 0
    let skippedNoHands = 0
    let skipped = 0
    const perClass: Record<string, number> = {}

    for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
      if (cancelRef.current) break
      const chunk = queue.slice(i, i + CHUNK_SIZE)
      // Process chunk sequentially (MediaPipe instance is single-threaded; parallel calls
      // queue up internally anyway).
      for (const item of chunk) {
        let img: HTMLImageElement | null = null
        try {
          img = await loadImage(item.file)
          const raws = await handpose.detectRawHandsFromImage(img)
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
        } catch (err) {
          skipped++
          console.warn(`[importer] ${item.file.name} skipped:`, err)
        } finally {
          if (img) releaseImage(img)
        }
      }
      setProgress({ done: Math.min(i + chunk.length, queue.length), total: queue.length })
      setLiveStats({ imported, skipped, skippedNoHands, perClass: { ...perClass } })
      // Yield to event loop so UI updates between chunks
      await new Promise((r) => setTimeout(r, 0))
    }

    // Suppress unused-variable warning for sessionId — kept for future audit.
    void sessionId
    if (newSamples.length > 0) onImported(newSamples)
    setStage('done')
  }

  function reset(): void {
    setStage('idle')
    setParsed([])
    setLabelCounts({})
    setNonLetterSkipped(0)
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
        title="Import dari folder (subfolder name = label, atau filename pattern)"
      >
        Import folder
      </button>
      <button
        type="button"
        onClick={openFilesPicker}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        disabled={!handpose || stage === 'processing'}
        title="Import multiple files (label dari filename pattern)"
      >
        Import files
      </button>
      {/* Folder picker — webkitdirectory attribute applied via ref (React strips it from JSX). */}
      <input ref={folderInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />
      {/* Multi-file picker — fallback for browsers/OS where folder picker is grey/disabled. */}
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFiles}
      />

      {stage === 'preview' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-800">Import preview</h2>
              <p className="mt-1 text-xs text-slate-500">
                Static menerima huruf A–Y (J & Z dynamic). Non-letter labels otomatis di-skip.
              </p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-4 py-3 text-sm">
              {validLabels.length === 0 ? (
                <p className="text-slate-500">
                  Tidak ada file dengan label huruf valid.{' '}
                  {nonLetterSkipped > 0 && `${nonLetterSkipped} file di-skip karena label non-letter.`}
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-slate-600">
                    {parsed.length} file total &middot; {validLabels.length} kelas huruf valid
                    {nonLetterSkipped > 0 && ` · ${nonLetterSkipped} di-skip (label non-letter)`}
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
                        <span className="text-xs text-slate-500">{labelCounts[label]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs text-slate-600">
                Akan di-import: <b>{totalSelected}</b>
              </span>
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
                  Import {totalSelected}
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
                {progress.done} / {progress.total} files processed
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
                  Cancel after current chunk
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
