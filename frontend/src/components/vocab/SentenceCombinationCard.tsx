'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Hand, Plus } from 'lucide-react'

/**
 * Visual illustration for the example sentence "kucing dan gajah".
 * Reuses the app's existing "X dan Y" combination idiom (see
 * CombinationCard) but with the two animals from this sentence.
 */
export function SentenceCombinationCard() {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h3 className="flex items-center justify-center gap-2 text-xl leading-snug font-bold text-amber-900">
          Kucing
          <span className="-skew-x-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xl font-black tracking-widest text-white uppercase">
            Dan
          </span>
          Gajah
        </h3>

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-50 to-orange-50 p-6">
          <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2">
            <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-60 blur-xl" />
            <div className="relative flex h-10 w-10 animate-bounce items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-lg">
              <Plus className="h-5 w-5 stroke-[4]" />
            </div>
          </div>

          <div className="relative z-10 mt-4 flex w-full items-center justify-center gap-4">
            <div className="group relative cursor-pointer transition-transform hover:scale-110">
              <div className="absolute -bottom-2 h-4 w-16 rounded-[100%] bg-amber-900/15 blur-md" />
              <div className="-rotate-6 text-5xl drop-shadow-xl">🐱</div>
            </div>

            <div className="absolute bottom-4 -z-10 h-2 w-10 bg-gradient-to-r from-transparent via-amber-200 to-transparent blur-[1px]" />

            <div className="group relative cursor-pointer transition-transform hover:scale-110">
              <div className="absolute -bottom-2 h-4 w-20 rounded-[100%] bg-orange-900/15 blur-md" />
              <div className="rotate-6 text-6xl drop-shadow-xl">🐘</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
            <Hand className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-slate-600">Isyarat DAN (Menggabungkan)</span>
        </div>
      </CardContent>
    </Card>
  )
}
