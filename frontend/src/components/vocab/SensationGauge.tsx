'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { GaugeConfig } from '@/lib/adverb-types'

interface SensationGaugeProps {
  word: string
  config: GaugeConfig
  category: string
}

export function SensationGauge({ word, config, category: _category }: SensationGaugeProps) {
  const fillPercent = Math.round(config.intensity_level * 100)

  const currentEmoji =
    config.intensity_level > 0.7 ? config.emoji_high : config.intensity_level > 0.3 ? '😬' : config.emoji_low

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">{word}</h2>

        <div className="flex h-20 w-20 items-center justify-center text-5xl transition-transform duration-200">
          {currentEmoji}
        </div>

        <div className="w-full max-w-xs">
          <div className="relative h-8 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
            <div
              className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full transition-all duration-500"
              style={{
                width: `${fillPercent}%`,
                backgroundColor: config.accent_color,
              }}
            >
              {fillPercent > 35 && (
                <span className="px-2 text-xs font-bold text-white">
                  {fillPercent}
                  {config.unit_symbol}
                </span>
              )}
            </div>
            {fillPercent <= 35 && (
              <span
                className="absolute inset-y-0 flex items-center pl-2 text-xs font-bold"
                style={{ color: config.accent_color, left: `${fillPercent + 2}%` }}
              >
                {fillPercent}
                {config.unit_symbol}
              </span>
            )}
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>{config.low_label}</span>
            <span>{config.high_label}</span>
          </div>
        </div>

        <div
          className="rounded-full px-4 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: config.accent_color }}
        >
          {config.sensation_word}
        </div>
      </CardContent>
    </Card>
  )
}
