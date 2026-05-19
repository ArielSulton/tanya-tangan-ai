'use client'

import { Card, CardContent } from '@/components/ui/card'

interface SepertiCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

/**
 * Visual card for the dynamic gesture word "seperti" (like / similar to).
 * Shows two similar fruits flanking an approximate-equals symbol — the
 * "A is like B" comparison metaphor.
 */
export function SepertiCard({ word, category: _category, mode = 'explore' }: SepertiCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className="text-3xl font-black tracking-widest text-violet-700 uppercase">{word}</h3>
        )}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-violet-50 to-indigo-50 p-8">
          <div className="absolute top-1/2 left-1/3 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200 opacity-40 blur-2xl" />
          <div className="absolute top-1/2 right-1/3 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200 opacity-40 blur-2xl" />

          <div className="relative z-10 flex items-center justify-center gap-4">
            <span className="text-[4rem] leading-none drop-shadow-xl sm:text-[5rem]">🍎</span>
            <span className="text-[2.5rem] font-black text-violet-600 drop-shadow sm:text-[3rem]">≈</span>
            <span className="text-[4rem] leading-none drop-shadow-xl sm:text-[5rem]">🍅</span>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-violet-700">Seperti</span> dipakai untuk membandingkan dua hal yang mirip
          — apel <em>seperti</em> tomat karena keduanya bulat dan merah.
        </p>
      </CardContent>
    </Card>
  )
}
