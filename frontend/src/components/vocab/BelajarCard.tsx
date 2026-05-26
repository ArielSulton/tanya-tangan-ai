'use client'

import { Card, CardContent } from '@/components/ui/card'

interface BelajarCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

/**
 * Visual card for the dynamic gesture word "belajar" (to learn / study).
 * Shows an open book paired with a glowing lightbulb — the classic
 * student-with-an-idea metaphor. Lightbulb pulses to suggest active learning.
 */
export function BelajarCard({ word, category: _category, mode = 'explore' }: BelajarCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className="text-3xl font-black tracking-widest text-indigo-700 uppercase">{word}</h3>
        )}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-indigo-50 to-amber-50 p-8">
          <div className="absolute top-6 right-8 h-24 w-24 rounded-full bg-amber-200 opacity-40 blur-2xl" />
          <div className="absolute bottom-4 left-6 h-20 w-20 rounded-full bg-indigo-200 opacity-40 blur-2xl" />

          <div className="relative z-10 flex items-end gap-4">
            <span className="animate-bounce-slow text-[5rem] leading-none drop-shadow-xl sm:text-[6rem]">📖</span>
            <span className="-mb-2 animate-pulse text-[3rem] leading-none drop-shadow-lg sm:text-[3.5rem]">💡</span>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-indigo-700">Belajar</span> berarti membaca, mendengarkan, atau berlatih
          untuk menambah pengetahuan baru.
        </p>
      </CardContent>
    </Card>
  )
}
