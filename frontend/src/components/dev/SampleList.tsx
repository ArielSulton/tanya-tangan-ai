'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface SampleRow {
  id: string
  label: string
  capturedAt: number
  source: 'manual' | 'yolo-auto'
}

interface Props {
  title: string
  samples: SampleRow[]
  onDelete: (id: string) => void
}

const ALL = '__all__'

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  return `${Math.floor(diff / 3_600_000)}h`
}

export function SampleList({ title, samples, onDelete }: Props): ReactNode {
  const listRef = useRef<HTMLUListElement>(null)
  const prevLenRef = useRef(samples.length)
  const [filter, setFilter] = useState<string>(ALL)

  // Unique class labels present in the dataset, sorted for stable order.
  const classOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of samples) counts.set(s.label, (counts.get(s.label) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [samples])

  // If the active filter's class no longer exists (last sample of that class
  // deleted), fall back to "All" so the user isn't stuck on an empty view.
  useEffect(() => {
    if (filter !== ALL && !classOptions.some(([label]) => label === filter)) {
      setFilter(ALL)
    }
  }, [classOptions, filter])

  const visible = useMemo(() => {
    if (filter === ALL) return samples
    return samples.filter((s) => s.label === filter)
  }, [samples, filter])

  // Auto-scroll to bottom when new samples are appended. Triggers only on
  // total-count increase; deletes/initial-load don't scroll-jerk the list.
  useEffect(() => {
    if (samples.length > prevLenRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
    prevLenRef.current = samples.length
  }, [samples.length])

  const isFiltered = filter !== ALL

  return (
    <div className="flex h-full max-h-[320px] min-h-0 flex-col rounded-md border border-slate-300 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
        <span>
          {title}{' '}
          <span className="text-xs font-normal text-slate-500">
            {isFiltered ? `(${visible.length} of ${samples.length})` : `(${samples.length})`}
          </span>
        </span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-mono font-normal text-slate-700 focus:border-emerald-500 focus:outline-none"
          aria-label="Filter by class"
          disabled={classOptions.length === 0}
        >
          <option value={ALL}>all</option>
          {classOptions.map(([label, count]) => (
            <option key={label} value={label}>
              {label} ({count})
            </option>
          ))}
        </select>
      </div>
      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-slate-400">
            {samples.length === 0 ? 'No samples yet' : `No samples in "${filter}"`}
          </li>
        )}
        {visible.map((s) => (
          <li key={s.id} className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-xs">
            <span className="font-mono">{s.label}</span>
            <span className="text-slate-500">{timeAgo(s.capturedAt)}</span>
            <span
              className={
                'rounded px-1 ' +
                (s.source === 'yolo-auto' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
              }
            >
              {s.source}
            </span>
            <button type="button" onClick={() => onDelete(s.id)} className="text-red-500 hover:underline">
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
