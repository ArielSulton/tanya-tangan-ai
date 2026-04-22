'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Hand } from 'lucide-react'

interface IntensityCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

export function IntensityCard({ word: _word, category: _category, mode = 'explore' }: IntensityCardProps) {
  return (
    <Card className="mx-auto flex h-full w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border-4 border-slate-100 bg-white shadow-xl">
      <CardContent className="flex h-full flex-col p-0">
        {/* Top: Biasa */}
        <div className="relative m-2 flex flex-1 items-center justify-between gap-4 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-6">
          <div className="relative z-10">
            {mode === 'explore' && (
              <h3 className="text-xl font-bold tracking-widest text-orange-600 uppercase">Biasa</h3>
            )}
          </div>

          <div className="relative z-10 flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border border-orange-100 bg-white/60 p-3 shadow-sm">
            <div className="flex h-full w-full items-end justify-center gap-1.5 pb-1">
              <div className="h-4 w-3 rounded-sm bg-orange-400" />
              <div className="h-6 w-3 rounded-sm bg-orange-400" />
              <div className="h-8 w-3 rounded-sm bg-slate-200" />
              <div className="h-10 w-3 rounded-sm bg-slate-200" />
              <div className="h-12 w-3 rounded-sm bg-slate-200" />
            </div>
          </div>
        </div>

        {/* Bottom: Sangat */}
        <div className="relative m-2 flex flex-1 items-center justify-between gap-4 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-6">
          <div className="absolute inset-0 animate-pulse bg-rose-200/30 mix-blend-multiply" />

          <div className="relative z-10">
            {mode === 'explore' && (
              <h3 className="text-2xl font-black tracking-widest text-rose-600 uppercase">Sangat</h3>
            )}
          </div>

          <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-2xl bg-white/80 p-3 shadow-lg ring-4 shadow-rose-200 ring-rose-100">
            <span className="absolute -top-4 -right-4 z-20 animate-bounce text-3xl text-yellow-500 drop-shadow-md">
              ⚡
            </span>
            <span className="absolute -bottom-2 -left-2 z-20 animate-pulse text-2xl text-rose-500 drop-shadow-md">
              🔥
            </span>

            <div className="flex h-full w-full items-end justify-center gap-1.5 pb-1">
              <div className="h-4 w-3.5 rounded-sm bg-gradient-to-t from-orange-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <div className="h-7 w-3.5 rounded-sm bg-gradient-to-t from-orange-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <div className="h-10 w-3.5 rounded-sm bg-gradient-to-t from-orange-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <div className="h-13 w-3.5 rounded-sm bg-gradient-to-t from-orange-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
              <div className="h-16 w-3.5 animate-pulse rounded-sm bg-gradient-to-t from-rose-500 to-pink-600 shadow-[0_0_15px_rgba(244,63,94,1)]" />
            </div>
          </div>
        </div>

        {/* Footer: Sign Language */}
        {mode === 'explore' && (
          <div className="mt-auto flex items-center justify-center gap-3 border-t-4 border-slate-100 bg-slate-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm">
              <Hand className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-sm text-slate-700">
              <span className="font-semibold">Isyarat SANGAT</span>
              <span className="text-xs font-medium text-slate-500">(Penekanan Kuat)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
