'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Hand, Pointer } from 'lucide-react'

interface SelectionCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

export function SelectionCard({ word: _word, category: _category, mode = 'explore' }: SelectionCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className="text-lg leading-snug font-bold text-amber-900">
            Apel{' '}
            <span className="bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-2xl font-black tracking-widest text-transparent uppercase">
              Yang
            </span>{' '}
            hijau
          </h3>
        )}

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-50 to-orange-50 p-6">
          <div className="absolute bottom-4 h-8 w-40 rounded-[100%] bg-amber-900/10 blur-[6px]" />
          <div className="absolute bottom-6 flex h-10 w-36 items-center justify-center overflow-hidden rounded-b-2xl border-b-4 border-amber-800 bg-gradient-to-b from-amber-600 to-amber-700 shadow-lg">
            <div className="absolute top-2 h-2 w-full border-t border-amber-500/40" />
            <div className="absolute top-5 h-2 w-full border-t border-amber-500/40" />
          </div>

          <div className="relative z-20 flex items-end justify-center pb-4">
            <div className="translate-x-2 translate-y-2 -rotate-12 text-4xl opacity-50 blur-[1px] grayscale-[50%]">
              🍎
            </div>

            <div className="relative z-30 mx-1">
              <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-300 opacity-80 blur-xl" />
              <div className="relative z-10 -translate-y-4 scale-110 text-5xl drop-shadow-xl">🍏</div>

              <div className="absolute -top-6 right-14 z-40 animate-bounce text-amber-900 drop-shadow-md">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-white/20 blur-md" />
                  <Pointer className="h-9 w-9 rotate-[135deg] fill-white text-amber-950" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="-translate-x-2 translate-y-4 rotate-12 text-4xl opacity-50 blur-[1px] grayscale-[50%]">
              🍎
            </div>
          </div>
        </div>

        {mode === 'explore' && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
              <Hand className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-600">Isyarat YANG (Menunjuk)</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
