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
    <div className="flex flex-col items-center gap-2">
      {src && !imgError ? (
        <Image
          src={src}
          alt={alt}
          width={160}
          height={160}
          className="h-40 w-40 rounded-xl object-cover shadow"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-gray-100 text-6xl shadow">
          {placeholder}
        </div>
      )}
      <span className="text-center text-sm font-semibold text-gray-700">{label}</span>
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
}: AbstractComparisonProps) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-3xl font-bold tracking-wide text-gray-900 uppercase">{word}</h2>
        <div className="flex w-full items-center justify-around gap-4">
          <ComparisonImage src={lowImageUrl} alt={lowLabel} label={lowLabel} category={category} />
          <span className="text-2xl font-bold text-gray-400">vs</span>
          <ComparisonImage src={highImageUrl} alt={highLabel} label={highLabel} category={category} />
        </div>
      </CardContent>
    </Card>
  )
}
