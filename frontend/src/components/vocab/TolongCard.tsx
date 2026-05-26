'use client'

import { Card, CardContent } from '@/components/ui/card'

interface TolongCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

/**
 * Visual card for the dynamic gesture word "tolong" (help / please).
 * Raised hand with an SOS-style ring around it, signalling a request
 * for help. Ring pulses outward to draw attention.
 */
export function TolongCard({ word, category: _category, mode = 'explore' }: TolongCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && <h3 className="text-3xl font-black tracking-widest text-sky-700 uppercase">{word}</h3>}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-sky-50 to-cyan-50 p-8">
          <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 opacity-30 blur-2xl" />

          <div className="relative z-10 flex items-center justify-center">
            {/* Pulsing rings behind the hand */}
            <span className="absolute h-32 w-32 animate-ping rounded-full border-4 border-sky-400/50 sm:h-36 sm:w-36" />
            <span className="absolute h-24 w-24 animate-ping rounded-full border-4 border-cyan-400/60 [animation-delay:300ms] sm:h-28 sm:w-28" />
            <span className="relative text-[5rem] leading-none drop-shadow-xl sm:text-[6rem]">🙋</span>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-sky-700">Tolong</span> diucapkan saat kita meminta bantuan atau
          mempersilakan orang lain dengan sopan.
        </p>
      </CardContent>
    </Card>
  )
}
