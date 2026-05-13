'use client'

import { type ReactNode } from 'react'

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

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  return `${Math.floor(diff / 3_600_000)}h`
}

export function SampleList({ title, samples, onDelete }: Props): ReactNode {
  return (
    <div className="flex h-full flex-col rounded-md border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
        {title} <span className="text-xs text-slate-500">({samples.length})</span>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {samples.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">No samples yet</li>}
        {samples.map((s) => (
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
