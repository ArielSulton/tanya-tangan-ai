'use client'

import { useState, type ReactNode, type FormEvent } from 'react'

interface Props {
  /** Currently active class label (or null = none). */
  active: string | null
  /** Called when the user picks or confirms a class. */
  onSelect: (label: string) => void
  /** Optional starter suggestions shown as chips. */
  suggestions?: readonly string[]
  /** Sample counts keyed by label — renders previously-used classes too. */
  counts?: Record<string, number>
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '_')
}

export function DynamicClassInput({ active, onSelect, suggestions = [], counts = {} }: Props): ReactNode {
  const [input, setInput] = useState<string>('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cleaned = normalize(input)
    if (cleaned.length === 0) return
    onSelect(cleaned)
    setInput('')
  }

  const recordedClasses = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([label]) => label)
    .sort()

  const suggestionChips = suggestions.filter((s) => !recordedClasses.includes(s))

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={active ? `current: ${active}` : 'type a class name (e.g. jeruk)'}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm focus:border-emerald-500 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          disabled={normalize(input).length === 0}
        >
          Use
        </button>
      </form>

      {recordedClasses.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase">Recorded:</span>
          {recordedClasses.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => onSelect(cls)}
              className={
                'rounded-md border px-2 py-0.5 font-mono text-xs ' +
                (cls === active
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')
              }
              aria-pressed={cls === active}
            >
              {cls}
              <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{counts[cls]}</span>
            </button>
          ))}
        </div>
      )}

      {suggestionChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase">Suggested:</span>
          {suggestionChips.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => onSelect(cls)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 hover:border-slate-400"
            >
              {cls}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
