'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface AIFallbackCardProps {
  suggestedWord: string | null
  explanation: string
  onTrySuggested?: (word: string) => void
}

export function AIFallbackCard({ suggestedWord, explanation, onTrySuggested }: AIFallbackCardProps) {
  return (
    <Card className="mx-auto w-full max-w-sm border-orange-200 bg-orange-50">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="h-6 w-6" />
          <span className="font-semibold">Kata belum tersedia</span>
        </div>
        {suggestedWord && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-gray-600">Maksud kamu:</span>
            <button
              onClick={() => onTrySuggested?.(suggestedWord)}
              className="rounded-lg bg-orange-100 px-4 py-2 text-lg font-bold text-orange-700 transition-colors hover:bg-orange-200"
            >
              {suggestedWord}
            </button>
          </div>
        )}
        <p className="text-center text-sm leading-relaxed text-gray-700">{explanation}</p>
      </CardContent>
    </Card>
  )
}
