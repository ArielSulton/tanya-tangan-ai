'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Hand, Plus } from 'lucide-react'

interface CombinationCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

export function CombinationCard({ word: _word, category: _category, mode = 'explore' }: CombinationCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className="flex items-center justify-center gap-2 text-xl leading-snug font-bold text-rose-900">
            Apel
            <span className="-skew-x-6 rounded-lg bg-gradient-to-r from-rose-500 to-purple-500 px-3 py-1 text-xl font-black tracking-widest text-white uppercase">
              Dan
            </span>
            Anggur
          </h3>
        )}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-rose-50 to-purple-50 p-6">
          <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2">
            <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-60 blur-xl" />
            <div className="relative flex h-10 w-10 animate-bounce items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-lg">
              <Plus className="h-5 w-5 stroke-[4]" />
            </div>
          </div>

          <div className="relative z-10 mt-4 flex w-full items-center justify-center gap-4">
            <div className="group relative cursor-pointer transition-transform hover:scale-110">
              <div className="absolute -bottom-2 h-4 w-16 rounded-[100%] bg-rose-900/15 blur-md" />
              <div className="-rotate-6 text-5xl drop-shadow-xl">🍎</div>
            </div>

            <div className="absolute bottom-4 -z-10 h-2 w-10 bg-gradient-to-r from-transparent via-rose-200 to-transparent blur-[1px]" />

            <div className="group relative cursor-pointer transition-transform hover:scale-110">
              <div className="absolute -bottom-2 h-4 w-16 rounded-[100%] bg-purple-900/15 blur-md" />
              <div className="rotate-6 text-5xl drop-shadow-xl">🍇</div>
            </div>
          </div>
        </div>

        {mode === 'explore' && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm">
              <Hand className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-600">Isyarat DAN (Menggabungkan)</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
