'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

interface ConcreteWordCardProps {
  word: string
  imageUrl: string | null
  category: string
}

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  hewan: '🐾',
  benda: '📦',
  alam: '🌿',
  perasaan: '😊',
  kata_keterangan: '⚡',
}

export function ConcreteWordCard({ word, imageUrl, category }: ConcreteWordCardProps) {
  const [imgError, setImgError] = useState(false)
  const placeholder = CATEGORY_PLACEHOLDERS[category] ?? '🖼️'

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-3xl font-bold tracking-wide text-gray-900 uppercase">{word}</h2>
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={word}
            width={192}
            height={192}
            className="h-48 w-48 rounded-xl object-cover shadow"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-gray-100 text-7xl shadow">
            {placeholder}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
