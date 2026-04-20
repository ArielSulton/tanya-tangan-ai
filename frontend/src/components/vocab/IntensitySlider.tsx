'use client'

import { useState, useCallback } from 'react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import type { SliderConfig } from '@/lib/adverb-types'

interface IntensitySliderProps {
  word: string
  config: SliderConfig
  comparison: {
    low_image_url: string
    high_image_url: string
    low_label: string
    high_label: string
    reference_word: string
  } | null
  category: string
}

export function IntensitySlider({ word, config, comparison, category: _category }: IntensitySliderProps) {
  const [position, setPosition] = useState(config.default_position)
  const [hasInteracted, setHasInteracted] = useState(false)

  const handlePositionChange = useCallback(
    (value: number[]) => {
      setPosition(value[0])
      if (!hasInteracted) setHasInteracted(true)
    },
    [hasInteracted],
  )

  const normalizedPosition = position / 100
  const intensityScale = 0.5 + normalizedPosition * 2.5
  const currentEmoji = normalizedPosition < 0.5 ? config.emoji_low : config.emoji_high
  const currentLabel =
    normalizedPosition < 0.3
      ? config.low_label
      : normalizedPosition > 0.7
        ? config.high_label
        : `${config.low_label}–${config.high_label}`

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">{word}</h2>
        {comparison?.reference_word && (
          <p className="text-center text-sm text-slate-500">
            memodifikasi:{' '}
            <span className="font-semibold" style={{ color: config.accent_color }}>
              {comparison.reference_word}
            </span>
          </p>
        )}

        <div
          className="flex h-24 w-24 items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${intensityScale})` }}
        >
          <span className="text-5xl sm:text-6xl">{currentEmoji}</span>
        </div>

        <p className="text-sm font-semibold transition-colors duration-200" style={{ color: config.accent_color }}>
          {currentLabel}
        </p>

        <div className="w-full px-2">
          <Slider
            value={[position]}
            onValueChange={handlePositionChange}
            min={0}
            max={100}
            step={1}
            className="w-full"
            aria-label={`Intensitas ${word}`}
          />
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{config.low_label}</span>
            <span>{config.high_label}</span>
          </div>
        </div>

        {comparison && (
          <div className="mt-2 flex w-full items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
              <div className="flex aspect-square w-full max-w-[100px] items-center justify-center rounded-lg bg-gray-50 text-3xl">
                {config.emoji_low}
              </div>
              <span className="text-xs font-medium text-slate-500">{comparison.low_label}</span>
            </div>
            <span className="shrink-0 text-lg font-bold text-slate-300">→</span>
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
              <div className="flex aspect-square w-full max-w-[100px] items-center justify-center rounded-lg bg-gray-50 text-3xl">
                {config.emoji_high}
              </div>
              <span className="text-xs font-medium text-slate-500">{comparison.high_label}</span>
            </div>
          </div>
        )}

        {hasInteracted && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-2 duration-300">
            <p className="text-center text-xs text-slate-400">Geser untuk melihat perbedaan intensitas</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
