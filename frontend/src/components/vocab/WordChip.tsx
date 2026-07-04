'use client'

import { X } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/vocab/category-labels'

interface WordChipProps {
  word: string
  category: string | null
  onRemove: () => void
}

export function WordChip({ word, category, onRemove }: WordChipProps) {
  const categoryLabel = category ? (CATEGORY_LABELS[category] ?? category) : null

  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold text-slate-800 capitalize">{word}</span>
        {categoryLabel && (
          <span className="text-[10px] font-medium tracking-wide text-emerald-600 uppercase">{categoryLabel}</span>
        )}
      </div>
      <button
        onClick={onRemove}
        aria-label={`Hapus kata ${word}`}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
