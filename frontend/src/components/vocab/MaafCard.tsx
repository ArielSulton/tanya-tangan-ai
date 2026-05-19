'use client'

import { Card, CardContent } from '@/components/ui/card'

interface MaafCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

/**
 * Visual card for the dynamic gesture word "maaf" (sorry / apologize).
 * Pairs the apologetic face emoji with a soft pink heart to convey
 * the act of asking for forgiveness. Heart pulses gently.
 */
export function MaafCard({ word, category: _category, mode = 'explore' }: MaafCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className="text-3xl font-black tracking-widest text-rose-700 uppercase">{word}</h3>
        )}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-rose-50 to-pink-50 p-8">
          <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-300 opacity-30 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3">
            <span className="text-[5rem] leading-none drop-shadow-xl sm:text-[6rem]">🙏</span>
            <span className="-mt-4 animate-pulse text-[2.5rem] leading-none drop-shadow-lg">💗</span>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-rose-700">Maaf</span> diucapkan ketika kita berbuat salah dan ingin
          meminta dimaafkan oleh orang lain.
        </p>
      </CardContent>
    </Card>
  )
}
