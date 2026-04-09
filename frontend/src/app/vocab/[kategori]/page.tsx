'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GestureRecognition } from '@/components/gesture/gesture-recognition'
import { ConcreteWordCard } from '@/components/vocab/ConcreteWordCard'
import { AbstractComparison } from '@/components/vocab/AbstractComparison'
import { AIFallbackCard } from '@/components/vocab/AIFallbackCard'
import { ArrowLeft, Loader2, Keyboard } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORY_LABELS: Record<string, string> = {
  hewan: 'Hewan',
  benda: 'Benda',
  alam: 'Alam',
  perasaan: 'Perasaan',
  kata_keterangan: 'Kata Keterangan',
}

interface WordComparison {
  low_image_url: string
  high_image_url: string
  low_label: string
  high_label: string
  reference_word: string
}

interface WordResult {
  id: string
  text: string
  category: string
  word_type: string
  image_url: string | null
  comparison: WordComparison | null
}

type LookupResult =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; word: WordResult }
  | { state: 'fallback'; gestureInput: string; suggestedWord: string | null; explanation: string }
  | { state: 'error' }

const VALID_CATEGORIES = ['hewan', 'benda', 'alam', 'perasaan', 'kata_keterangan']

export default function VocabKategoriPage() {
  const params = useParams()
  const kategori = params.kategori as string
  const router = useRouter()
  const [result, setResult] = useState<LookupResult>({ state: 'idle' })
  const [retryCount, setRetryCount] = useState(0)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualWord, setManualWord] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!VALID_CATEGORIES.includes(kategori)) {
      router.replace('/vocab')
    }
  }, [kategori, router])

  const handleWordFormed = useCallback(
    async (word: string) => {
      if (!word.trim() || result.state === 'loading') return
      setResult({ state: 'loading' })

      try {
        const lookupRes = await fetch(
          `/api/backend/api/v1/vocab/lookup?word=${encodeURIComponent(word.toLowerCase())}&category=${encodeURIComponent(kategori)}`,
        )
        if (!lookupRes.ok) throw new Error('Lookup failed')

        const lookupData = await lookupRes.json()
        if (lookupData.found && lookupData.word) {
          setResult({ state: 'found', word: lookupData.word })
          return
        }

        const fallbackRes = await fetch('/api/backend/api/v1/vocab/fallback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gesture_input: word, category: kategori }),
        })
        if (!fallbackRes.ok) throw new Error('Fallback failed')

        const fallbackData = await fallbackRes.json()
        setResult({
          state: 'fallback',
          gestureInput: word,
          suggestedWord: fallbackData.suggested_word ?? null,
          explanation: fallbackData.explanation,
        })
      } catch {
        setResult({ state: 'error' })
      }
    },
    [kategori, result.state],
  )

  const handleTrySuggested = useCallback(
    (word: string) => {
      void handleWordFormed(word)
    },
    [handleWordFormed],
  )

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((c) => c + 1)
      setResult({ state: 'idle' })
    }
  }

  const handleManualSubmit = () => {
    if (manualWord.trim()) {
      void handleWordFormed(manualWord.trim())
      setManualWord('')
    }
  }

  const toggleManualInput = () => {
    setShowManualInput((v) => !v)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const categoryLabel = CATEGORY_LABELS[kategori] ?? kategori

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/vocab" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          Pilih kategori lain
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Kategori: <span className="text-indigo-600">{categoryLabel}</span>
        </h1>

        <div className="mb-4">
          <GestureRecognition
            onWordFormed={(word) => {
              void handleWordFormed(word)
            }}
            enableWordFormation={true}
            showAlternatives={false}
          />
        </div>

        {/* Manual input toggle */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <button
            onClick={toggleManualInput}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Keyboard className="h-3.5 w-3.5" />
            {showManualInput ? 'Tutup input teks' : 'Ketik kata langsung'}
          </button>

          {showManualInput && (
            <div className="flex w-full max-w-xs gap-2">
              <Input
                ref={inputRef}
                value={manualWord}
                onChange={(e) => setManualWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder={`Ketik kata ${categoryLabel.toLowerCase()}...`}
                className="text-sm"
              />
              <Button onClick={handleManualSubmit} disabled={!manualWord.trim() || result.state === 'loading'}>
                Cari
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center">
          {result.state === 'idle' && <p className="text-center text-gray-500">Gesturkan kata untuk melihat artinya</p>}

          {result.state === 'loading' && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Mencari kata...</span>
            </div>
          )}

          {result.state === 'found' && result.word.word_type === 'konkret' && (
            <ConcreteWordCard
              word={result.word.text}
              imageUrl={result.word.image_url}
              category={result.word.category}
            />
          )}

          {result.state === 'found' && result.word.word_type === 'abstrak' && result.word.comparison && (
            <AbstractComparison
              word={result.word.text}
              lowImageUrl={result.word.comparison.low_image_url}
              highImageUrl={result.word.comparison.high_image_url}
              lowLabel={result.word.comparison.low_label}
              highLabel={result.word.comparison.high_label}
              category={result.word.category}
            />
          )}

          {result.state === 'found' && result.word.word_type === 'abstrak' && !result.word.comparison && (
            <div className="text-center text-sm text-gray-500 p-4">
              Data visual untuk kata ini belum tersedia.
            </div>
          )}

          {result.state === 'fallback' && (
            <AIFallbackCard
              suggestedWord={result.suggestedWord}
              explanation={result.explanation}
              onTrySuggested={handleTrySuggested}
            />
          )}

          {result.state === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-center text-red-500">Terjadi kesalahan. Coba lagi.</p>
              {retryCount < 3 && (
                <Button variant="outline" onClick={handleRetry}>
                  Coba Lagi
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
