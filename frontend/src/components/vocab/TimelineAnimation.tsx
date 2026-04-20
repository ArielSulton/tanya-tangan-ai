'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { TimelineConfig } from '@/lib/adverb-types'

interface TimelineAnimationProps {
  word: string
  config: TimelineConfig
  category: string
}

export function TimelineAnimation({ word, config, category: _category }: TimelineAnimationProps) {
  const [activeSlots, setActiveSlots] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    if (!isAnimating) return

    const interval = setInterval(() => {
      setActiveSlots((prev) => {
        if (prev >= config.occurrence_count) {
          setTimeout(() => setActiveSlots(0), 800)
          return prev
        }
        return prev + 1
      })
    }, 300)

    return () => clearInterval(interval)
  }, [isAnimating, config.occurrence_count])

  const handleToggle = () => {
    setActiveSlots(0)
    setIsAnimating((prev) => !prev)
  }

  const slots = Array.from({ length: config.total_slots }, (_, i) => i)

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">{word}</h2>

        <p className="text-center text-sm font-semibold" style={{ color: config.accent_color }}>
          {config.description}
        </p>

        <div className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {slots.map((i) => (
              <div
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all duration-200"
                style={{
                  backgroundColor: i < activeSlots ? config.accent_color : '#f1f5f9',
                  transform: i < activeSlots ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {i < activeSlots ? config.icon_filled : config.icon_empty}
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>{config.period_label}</span>
            <span className="font-medium" style={{ color: config.accent_color }}>
              {activeSlots}/{config.total_slots} kali
            </span>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: config.accent_color }}
        >
          {isAnimating ? '⏸ Jeda' : '▶ Putar Ulang'}
        </button>
      </CardContent>
    </Card>
  )
}
