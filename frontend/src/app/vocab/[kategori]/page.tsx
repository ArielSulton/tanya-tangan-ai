'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GestureRecognition } from '@/components/gesture/gesture-recognition'
import { ConcreteWordCard } from '@/components/vocab/ConcreteWordCard'
import { AbstractComparison } from '@/components/vocab/AbstractComparison'
import { AIFallbackCard } from '@/components/vocab/AIFallbackCard'
import { IntensitySlider } from '@/components/vocab/IntensitySlider'
import { TimelineAnimation } from '@/components/vocab/TimelineAnimation'
import { CertaintyDial } from '@/components/vocab/CertaintyDial'
import { SensationGauge } from '@/components/vocab/SensationGauge'
import { DragDropQuiz } from '@/components/vocab/DragDropQuiz'
import { ImageMatchQuiz } from '@/components/vocab/ImageMatchQuiz'
import { SizeContrastCard } from '@/components/vocab/SizeContrastCard'
import { IntensityCard } from '@/components/vocab/IntensityCard'
import { SelectionCard } from '@/components/vocab/SelectionCard'
import { CombinationCard } from '@/components/vocab/CombinationCard'
import type { AdverbSubcategory, SliderConfig, TimelineConfig, CertaintyConfig, GaugeConfig } from '@/lib/adverb-types'
import { getInteractionComponent } from '@/lib/adverb-types'
import { ArrowLeft, Loader2, Keyboard, Gamepad2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORY_LABELS: Record<string, string> = {
  hewan: 'Hewan',
  benda: 'Benda',
  alam: 'Alam',
  perasaan: 'Perasaan',
  kata_keterangan: 'Kata Keterangan Abstrak',
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
  adverb_subcategory: AdverbSubcategory | null
  slider_config: SliderConfig | null
  timeline_config: TimelineConfig | null
  certainty_config: CertaintyConfig | null
  gauge_config: GaugeConfig | null
}

type LookupResult =
  | { state: 'idle' }
  | { state: 'pending'; word: string; suggestedWord: string | null; explanation: string | null }
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
  const [manualWord, setManualWord] = useState('')
  const [mode, setMode] = useState<'explore' | 'quiz'>('explore')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!VALID_CATEGORIES.includes(kategori)) {
      router.replace('/vocab')
    }
  }, [kategori, router])

  const handleWordFormed = useCallback(
    async (word: string) => {
      if (!word.trim()) return
      setResult({ state: 'loading' })

      try {
        const lookupRes = await fetch(
          `/api/v1/vocab/lookup?word=${encodeURIComponent(word.toLowerCase())}&category=${encodeURIComponent(kategori)}`,
        )
        if (!lookupRes.ok) throw new Error('Lookup failed')

        const lookupData = await lookupRes.json()
        if (lookupData.found && lookupData.word) {
          setResult({ state: 'found', word: lookupData.word })
          return
        }

        const fallbackRes = await fetch('/api/v1/vocab/fallback', {
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
    [kategori],
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

  const categoryLabel = CATEGORY_LABELS[kategori] ?? kategori

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 selection:bg-emerald-200">
      {/* Premium Glowing Ambient Orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-200/40 mix-blend-multiply blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-blue-200/40 mix-blend-multiply blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-100/40 mix-blend-multiply blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/vocab"
              className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-emerald-600 hover:shadow"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
            <button
              onClick={() => setMode(mode === 'explore' ? 'quiz' : 'explore')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm ring-1 backdrop-blur-md transition-all ${
                mode === 'quiz'
                  ? 'bg-emerald-600 text-white ring-emerald-700 hover:bg-emerald-700'
                  : 'bg-white/50 text-slate-600 ring-slate-900/5 hover:bg-white hover:text-emerald-600'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              {mode === 'quiz' ? 'Mode Jelajah' : 'Mode Kuis'}
            </button>
          </div>
          <div className="rounded-full bg-white/50 px-5 py-2 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md">
            <h1 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Kategori:{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text font-bold text-transparent">
                {categoryLabel}
              </span>
            </h1>
          </div>
        </div>

        {/* Main Glassmorphic Card */}
        {mode === 'quiz' ? (
          <div className="mx-auto max-w-lg">
            {kategori === 'kata_keterangan' ? (
              <DragDropQuiz category={kategori} onExit={() => setMode('explore')} />
            ) : (
              <ImageMatchQuiz category={kategori} onExit={() => setMode('explore')} />
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-8">
            <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
              {/* Left Column: Camera & Manual Input */}
              <div className="flex flex-col gap-6 lg:col-span-7">
                {/* Camera/Gesture Area */}
                <div className="min-h-[460px] flex-grow overflow-hidden rounded-[2.5rem] bg-slate-50 p-2 shadow-inner ring-1 ring-black/5">
                  <GestureRecognition
                    onWordFormed={(word) => {
                      const normalized = word.toLowerCase()
                      // EXPERIMENTAL: Jika input startsWith 'y' di kata_keterangan, langsung suggest 'yang'
                      const immediateSuggestion =
                        normalized.startsWith('y') && kategori === 'kata_keterangan'
                          ? 'yang'
                          : normalized.startsWith('k') && kategori === 'hewan'
                            ? 'kucing'
                            : null
                      setResult({
                        state: 'pending',
                        word: normalized,
                        suggestedWord: immediateSuggestion,
                        explanation: null,
                      })

                      void (async () => {
                        try {
                          const fallbackRes = await fetch('/api/v1/vocab/fallback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ gesture_input: normalized, category: kategori }),
                          })
                          if (fallbackRes.ok) {
                            const data = await fallbackRes.json()
                            // Only update if user hasn't already acted on it.
                            // If we already have a hardcoded prefix suggestion (immediateSuggestion),
                            // don't let the backend override it — prefix rules take priority.
                            setResult((prev) => {
                              if (prev.state !== 'pending' || prev.word !== normalized) return prev
                              return {
                                state: 'pending',
                                word: normalized,
                                suggestedWord: prev.suggestedWord ?? data.suggested_word ?? null,
                                explanation: prev.suggestedWord ? prev.explanation : (data.explanation ?? null),
                              }
                            })
                          }
                        } catch {}
                      })()
                    }}
                    enableWordFormation={true}
                    showAlternatives={false}
                  />
                </div>

                {result.state === 'pending' && (
                  <div className="flex flex-col gap-3 rounded-3xl bg-amber-50 p-4 shadow-sm ring-2 ring-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-2xl">
                          ✋
                        </div>
                        <div>
                          <p className="text-xs font-medium tracking-wide text-amber-600 uppercase">Kata Terdeteksi</p>
                          <p className="text-2xl font-black tracking-widest text-slate-800 uppercase">{result.word}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const wordToSearch = result.suggestedWord ?? result.word
                            void handleWordFormed(wordToSearch)
                          }}
                          className="h-10 rounded-full bg-emerald-500 px-6 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-emerald-600"
                        >
                          Cari
                        </Button>
                        <Button
                          onClick={() => {
                            setResult({ state: 'idle' })
                          }}
                          variant="outline"
                          className="h-10 rounded-full px-4 font-bold shadow-sm"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                    {result.suggestedWord && (
                      <div className="flex flex-col gap-2 border-t border-amber-200 pt-3">
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <span className="font-medium">Maksud kamu:</span>
                          <button
                            onClick={() => {
                              void handleWordFormed(result.suggestedWord!)
                            }}
                            className="rounded-lg bg-orange-100 px-3 py-1 font-bold text-orange-700 transition-colors hover:bg-orange-200"
                          >
                            {result.suggestedWord}
                          </button>
                        </div>
                        {result.explanation && (
                          <p className="text-xs leading-relaxed text-slate-600">{result.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Always-visible Manual Input */}
                <div className="flex flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 transition-all focus-within:ring-2 focus-within:ring-emerald-400">
                  <div className="flex w-full items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                      <Keyboard className="h-5 w-5" />
                    </div>
                    <Input
                      ref={inputRef}
                      value={manualWord}
                      onChange={(e) => setManualWord(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                      placeholder={`Ketik kata...`}
                      className="h-12 border-0 bg-transparent text-lg font-medium text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      onClick={handleManualSubmit}
                      disabled={!manualWord.trim() || result.state === 'loading'}
                      className="h-12 rounded-full bg-emerald-500 px-6 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Cari
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Results Area */}
              <div className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white/50 p-6 shadow-sm lg:col-span-5">
                <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-10">
                  <svg className="h-32 w-32 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>

                <div className="relative z-10 flex w-full flex-grow flex-col items-center justify-center">
                  {(result.state === 'idle' || result.state === 'pending') && (
                    <div className="animate-in zoom-in mx-auto flex max-w-sm flex-col items-center text-center duration-500">
                      <div className="mb-6 flex h-32 w-32 rotate-3 items-center justify-center rounded-[2.5rem] bg-emerald-100/50 text-7xl shadow-inner ring-1 ring-emerald-200 transition-transform hover:rotate-6">
                        👋
                      </div>
                      <h3 className="mb-3 text-2xl font-black text-slate-800">Ayo, tunjukkan isyaratmu!</h3>
                      <p className="text-base leading-relaxed font-medium text-slate-500">
                        Nyalakan kamera dan mulailah memperagakan isyarat, atau ketik kata di bawah kamera untuk melihat
                        hasilnya di sini.
                      </p>
                    </div>
                  )}

                  {result.state === 'loading' && (
                    <div className="flex flex-col items-center gap-4 text-emerald-600">
                      <Loader2 className="h-10 w-10 animate-spin" />
                      <span className="animate-pulse text-lg font-semibold">Mencari makna kata...</span>
                    </div>
                  )}

                  {result.state === 'found' && result.word.word_type === 'konkret' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                      <ConcreteWordCard
                        word={result.word.text}
                        imageUrl={result.word.image_url}
                        category={result.word.category}
                      />
                    </div>
                  )}

                  {result.state === 'found' &&
                    result.word.word_type === 'abstrak' &&
                    (() => {
                      const w = result.word.text.toLowerCase()
                      const isStaticCardWord =
                        w === 'besar' || w === 'kecil' || w === 'sangat' || w === 'yang' || w === 'dan'

                      if (isStaticCardWord && result.word.category === 'kata_keterangan') {
                        if (w === 'besar' || w === 'kecil') {
                          return (
                            <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                              <SizeContrastCard word={result.word.text} category={result.word.category} />
                            </div>
                          )
                        }
                        if (w === 'sangat') {
                          return (
                            <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                              <IntensityCard word={result.word.text} category={result.word.category} />
                            </div>
                          )
                        }
                        if (w === 'yang') {
                          return (
                            <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                              <SelectionCard word={result.word.text} category={result.word.category} />
                            </div>
                          )
                        }
                        if (w === 'dan') {
                          return (
                            <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                              <CombinationCard word={result.word.text} category={result.word.category} />
                            </div>
                          )
                        }
                      }

                      const interactionType = getInteractionComponent(
                        result.word.category,
                        result.word.adverb_subcategory,
                      )

                      if (interactionType === 'intensity-slider' && result.word.slider_config) {
                        return (
                          <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                            <IntensitySlider
                              word={result.word.text}
                              config={result.word.slider_config}
                              comparison={result.word.comparison}
                              category={result.word.category}
                            />
                          </div>
                        )
                      }

                      if (interactionType === 'timeline-animation' && result.word.timeline_config) {
                        return (
                          <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                            <TimelineAnimation
                              word={result.word.text}
                              config={result.word.timeline_config}
                              category={result.word.category}
                            />
                          </div>
                        )
                      }

                      if (interactionType === 'certainty-dial' && result.word.certainty_config) {
                        return (
                          <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                            <CertaintyDial
                              word={result.word.text}
                              config={result.word.certainty_config}
                              category={result.word.category}
                            />
                          </div>
                        )
                      }

                      if (interactionType === 'sensation-gauge' && result.word.gauge_config) {
                        return (
                          <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                            <SensationGauge
                              word={result.word.text}
                              config={result.word.gauge_config}
                              category={result.word.category}
                            />
                          </div>
                        )
                      }

                      // Static fallback: only works with comparison data
                      if (result.word.comparison) {
                        return (
                          <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
                            <AbstractComparison
                              word={result.word.text}
                              lowImageUrl={result.word.comparison.low_image_url}
                              highImageUrl={result.word.comparison.high_image_url}
                              lowLabel={result.word.comparison.low_label}
                              highLabel={result.word.comparison.high_label}
                              category={result.word.category}
                              referenceWord={result.word.comparison.reference_word}
                            />
                          </div>
                        )
                      }

                      return null
                    })()}

                  {result.state === 'fallback' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 flex h-full w-full flex-col justify-center duration-500">
                      <AIFallbackCard
                        suggestedWord={result.suggestedWord}
                        explanation={result.explanation}
                        onTrySuggested={handleTrySuggested}
                      />
                    </div>
                  )}

                  {result.state === 'error' && (
                    <div className="flex w-full flex-col items-center justify-center gap-5 rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="mb-1 text-lg font-bold text-red-800">Gagal memproses</h3>
                        <p className="mb-6 text-sm font-medium text-red-600">
                          Terjadi kesalahan saat menghubungi sistem.
                        </p>
                        {retryCount < 3 && (
                          <Button
                            onClick={handleRetry}
                            className="w-full rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700"
                          >
                            Coba Lagi
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
