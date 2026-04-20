'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { CertaintyConfig } from '@/lib/adverb-types'

interface CertaintyDialProps {
  word: string
  config: CertaintyConfig
  category: string
}

export function CertaintyDial({ word, config, category: _category }: CertaintyDialProps) {
  const filledDeg = config.certainty_level * 360
  const emptyDeg = 360 - filledDeg

  const dialColor = config.certainty_level > 0.7 ? '#22c55e' : config.certainty_level > 0.4 ? '#f59e0b' : '#ef4444'

  const currentEmoji = config.certainty_level > 0.7 ? config.emoji_certain : config.emoji_uncertain

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">{word}</h2>

        <div className="relative flex items-center justify-center">
          <div
            className="h-40 w-40 rounded-full sm:h-48 sm:w-48"
            style={{
              background: `conic-gradient(${dialColor} ${filledDeg}deg, #e2e8f0 ${filledDeg}deg ${filledDeg + emptyDeg}deg)`,
            }}
          />
          <div className="absolute flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner sm:h-32 sm:w-32">
            <span className="text-4xl sm:text-5xl">{currentEmoji}</span>
            <span className="mt-1 text-xs font-bold uppercase sm:text-sm" style={{ color: dialColor }}>
              {config.certainty_level > 0.7 ? config.high_label : config.low_label}
            </span>
          </div>
        </div>

        <p className="text-center text-sm font-semibold" style={{ color: config.accent_color }}>
          {config.description}
        </p>

        <div className="flex w-full max-w-xs justify-between text-xs text-slate-400">
          <span>{config.low_label}</span>
          <span className="font-medium" style={{ color: config.accent_color }}>
            {Math.round(config.certainty_level * 100)}% yakin
          </span>
          <span>{config.high_label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
