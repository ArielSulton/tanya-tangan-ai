'use client'

import { type ReactNode } from 'react'

interface Props {
  /** Class labels to render. */
  classes: readonly string[]
  /** Currently selected label (or null = none). */
  active: string | null
  /** Called when user clicks a class. */
  onSelect: (label: string) => void
  /** Optional: counts per label, rendered as a small badge. */
  counts?: Record<string, number>
}

export function ClassPicker({ classes, active, onSelect, counts }: Props): ReactNode {
  return (
    <div className="flex flex-wrap gap-2">
      {classes.map((cls) => {
        const isActive = cls === active
        const count = counts?.[cls] ?? 0
        return (
          <button
            key={cls}
            type="button"
            onClick={() => onSelect(cls)}
            className={
              'rounded-md border px-3 py-1.5 font-mono text-sm transition-colors ' +
              (isActive
                ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')
            }
            aria-pressed={isActive}
          >
            <span>{cls}</span>
            {count > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
