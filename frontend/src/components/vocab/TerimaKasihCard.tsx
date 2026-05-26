'use client'

import { Card, CardContent } from '@/components/ui/card'

interface TerimaKasihCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

/**
 * Visual card for the dynamic gesture word "terima_kasih" / "terima kasih"
 * (thank you). Combines folded hands with sparkling stars to convey
 * gratitude. Sparkles animate independently for warmth.
 */
export function TerimaKasihCard({ word, category: _category, mode = 'explore' }: TerimaKasihCardProps) {
  // Display form: "terima_kasih" (training-data form) → "Terima Kasih"
  const display = word.replace(/_/g, ' ')

  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className="text-3xl font-black tracking-widest text-amber-700 uppercase">{display}</h3>
        )}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-amber-50 to-yellow-50 p-8">
          <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 opacity-30 blur-2xl" />

          <div className="relative z-10 flex items-center">
            <span className="animate-bounce-slow -mr-2 text-[2rem] leading-none drop-shadow">✨</span>
            <span className="text-[5rem] leading-none drop-shadow-xl sm:text-[6rem]">🙏</span>
            <span className="animate-bounce-slow -ml-2 text-[2rem] leading-none drop-shadow [animation-delay:200ms]">
              ✨
            </span>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-amber-700">Terima kasih</span> diucapkan untuk menghargai kebaikan atau
          bantuan yang diberikan orang lain.
        </p>
      </CardContent>
    </Card>
  )
}
