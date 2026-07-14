'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

/**
 * Visual illustration for the example sentence
 * "kucing yang kecil dan gajah yang besar".
 * Combines the size-contrast idiom (see SentenceTreeSizeCard) with the
 * "X dan Y" combination idiom (see SentenceCombinationCard): a small,
 * greyed-out cat paired with a large, glowing elephant.
 */
export function SentenceComboSizeCard() {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h3 className="text-center text-xl leading-snug font-black tracking-wide text-amber-900">
          Kucing <span className="text-slate-400">yang</span> Kecil{' '}
          <span className="-skew-x-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-lg font-black tracking-widest text-white uppercase">
            Dan
          </span>{' '}
          Gajah <span className="text-slate-400">yang</span> Besar
        </h3>

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-50 to-orange-50 p-6">
          <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2">
            <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-60 blur-xl" />
            <div className="relative flex h-10 w-10 animate-bounce items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-lg">
              <Plus className="h-5 w-5 stroke-[4]" />
            </div>
          </div>

          <div className="relative z-10 mt-4 flex w-full items-end justify-center gap-6 px-4">
            <div className="relative z-10 flex scale-75 flex-col items-center opacity-80">
              <span className="-rotate-6 text-[2.5rem] leading-none drop-shadow-xl sm:text-[3rem]">🐱</span>
              <div className="h-1.5 w-10 rounded-full bg-black/15 blur-[1px]" />
            </div>

            <div className="relative z-20 flex scale-125 flex-col items-center">
              <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-200/50 blur-xl" />
              <span className="animate-bounce-slow rotate-6 text-[4rem] leading-none drop-shadow-xl sm:text-[4.5rem]">
                🐘
              </span>
              <div className="animate-shadow-bounce h-2 w-16 rounded-full bg-black/15 blur-[2px]" />
            </div>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          Gajah besar itu jauh lebih besar dibanding kucing kecil di sebelahnya.
        </p>
      </CardContent>
    </Card>
  )
}
