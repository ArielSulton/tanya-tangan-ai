'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Hand } from 'lucide-react'

interface SizeContrastCardProps {
  word: string
  category: string
  mode?: 'explore' | 'quiz'
}

export function SizeContrastCard({ word, category: _category, mode = 'explore' }: SizeContrastCardProps) {
  const normalizedWord = word.toLowerCase()
  const isBesar = normalizedWord === 'besar'

  const theme = isBesar
    ? { bg: 'from-emerald-50 to-teal-50', text: 'text-emerald-700', glow: 'bg-emerald-300' }
    : { bg: 'from-sky-50 to-blue-50', text: 'text-sky-700', glow: 'bg-sky-300' }

  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {mode === 'explore' && (
          <h3 className={`text-3xl font-black tracking-widest uppercase ${theme.text}`}>{word}</h3>
        )}

        <div
          className={`relative flex w-full flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b p-8 ${theme.bg} min-h-[180px] overflow-hidden`}
        >
          <div
            className={`absolute top-1/2 h-40 w-40 -translate-y-1/2 rounded-full opacity-40 mix-blend-multiply blur-2xl ${theme.glow} ${isBesar ? 'left-1/3 -translate-x-1/2' : 'right-1/3 translate-x-1/4'}`}
          />

          <div className="relative z-10 flex w-full items-end justify-center gap-6 px-4">
            <div
              className={`relative flex flex-col items-center transition-all duration-500 ${isBesar ? 'z-20 scale-110' : 'z-10 scale-90 opacity-40 grayscale'}`}
            >
              {isBesar && <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-200/50 blur-xl" />}
              <span
                className={`text-[5rem] leading-none drop-shadow-xl sm:text-[6rem] ${isBesar ? 'animate-bounce-slow' : ''}`}
              >
                ⚽
              </span>
              <div
                className={`h-2 w-20 rounded-full bg-black/15 blur-[2px] ${isBesar ? 'animate-shadow-bounce' : ''}`}
              />
            </div>

            <div
              className={`relative flex flex-col items-center transition-all duration-500 ${!isBesar ? 'z-20 scale-110' : 'z-10 scale-90 opacity-40 grayscale'}`}
            >
              {!isBesar && <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-200/50 blur-xl" />}
              <span
                className={`text-[2.5rem] leading-none drop-shadow-xl sm:text-[3rem] ${!isBesar ? 'animate-bounce-slow' : ''}`}
              >
                ⚽
              </span>
              <div
                className={`h-1.5 w-10 rounded-full bg-black/15 blur-[1px] ${!isBesar ? 'animate-shadow-bounce' : ''}`}
              />
            </div>
          </div>
        </div>

        {mode === 'explore' && (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm ${isBesar ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-sky-400 to-blue-500'}`}
            >
              <Hand className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              Isyarat {word.toUpperCase()} ({isBesar ? 'Membuka' : 'Menguncup'})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
