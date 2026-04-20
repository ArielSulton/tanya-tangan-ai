'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

interface AbstractComparisonProps {
  word: string
  lowImageUrl: string
  highImageUrl: string
  lowLabel: string
  highLabel: string
  category: string
  referenceWord?: string
}

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  hewan: '🐾',
  benda: '📦',
  alam: '🌿',
  perasaan: '😊',
  kata_keterangan: '⚡',
}

function ComparisonImage({ src, alt, label, category }: { src: string; alt: string; label: string; category: string }) {
  const [imgError, setImgError] = useState(false)
  const placeholder = CATEGORY_PLACEHOLDERS[category] ?? '🖼️'

  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      {src && !imgError ? (
        <div className="w-full max-w-[160px]">
          <Image
            src={src}
            alt={alt}
            width={160}
            height={160}
            className="aspect-square w-full rounded-xl object-cover shadow"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full max-w-[160px] items-center justify-center rounded-xl bg-gray-100 text-4xl shadow sm:text-6xl">
          {placeholder}
        </div>
      )}
      <span className="text-sm leading-tight font-semibold text-gray-700">{label}</span>
    </div>
  )
}

export function AbstractComparison({
  word,
  lowImageUrl,
  highImageUrl,
  lowLabel,
  highLabel,
  category,
  referenceWord,
}: AbstractComparisonProps) {
  const isKataKeterangan = category === 'kata_keterangan'

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">{word}</h2>
        {isKataKeterangan && referenceWord && (
          <p className="text-center text-sm text-slate-500">
            memodifikasi: <span className="font-semibold text-emerald-600">{referenceWord}</span>
          </p>
        )}
        <div className="mt-2 flex w-full items-center justify-between gap-2 sm:gap-4">
          <ComparisonImage src={lowImageUrl} alt={lowLabel} label={lowLabel} category={category} />
          <span className="shrink-0 text-xl font-bold text-slate-300 sm:text-2xl">↔</span>
          <ComparisonImage src={highImageUrl} alt={highLabel} label={highLabel} category={category} />
        </div>
        {isKataKeterangan && (
          <p className="mt-2 text-center text-xs text-slate-400">Geser intensitas dari rendah ke tinggi</p>
        )}
      </CardContent>
    </Card>
  )
}
