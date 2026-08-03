'use client'

import type { ComponentType, ReactNode } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Hand,
  Info,
  Keyboard,
  Leaf,
  Lightbulb,
  MessageCircle,
  PawPrint,
  Play,
  Plus,
  RotateCcw,
  Search,
  Star,
} from 'lucide-react'

import Link from 'next/link'

import { GestureRecognition } from '@/components/gesture/gesture-recognition'
import { AbstractComparison } from '@/components/vocab/AbstractComparison'
import { AIFallbackCard } from '@/components/vocab/AIFallbackCard'
import { BelajarCard } from '@/components/vocab/BelajarCard'
import { CertaintyDial } from '@/components/vocab/CertaintyDial'
import { CombinationCard } from '@/components/vocab/CombinationCard'
import { ConcreteWordCard } from '@/components/vocab/ConcreteWordCard'
import { DragDropQuiz } from '@/components/vocab/DragDropQuiz'
import { ImageMatchQuiz } from '@/components/vocab/ImageMatchQuiz'
import { IntensityCard } from '@/components/vocab/IntensityCard'
import { IntensitySlider } from '@/components/vocab/IntensitySlider'
import { MaafCard } from '@/components/vocab/MaafCard'
import { SelectionCard } from '@/components/vocab/SelectionCard'
import { SensationGauge } from '@/components/vocab/SensationGauge'
import { SentenceCombinationCard } from '@/components/vocab/SentenceCombinationCard'
import { SentenceComboSizeCard } from '@/components/vocab/SentenceComboSizeCard'
import { SentenceFruitSizeCard } from '@/components/vocab/SentenceFruitSizeCard'
import { SentenceTreeSizeCard } from '@/components/vocab/SentenceTreeSizeCard'
import { SepertiCard } from '@/components/vocab/SepertiCard'
import { SizeContrastCard } from '@/components/vocab/SizeContrastCard'
import { TerimaKasihCard } from '@/components/vocab/TerimaKasihCard'
import { TimelineAnimation } from '@/components/vocab/TimelineAnimation'
import { TolongCard } from '@/components/vocab/TolongCard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  getInteractionComponent,
  type AdverbSubcategory,
  type CertaintyConfig,
  type GaugeConfig,
  type SliderConfig,
  type TimelineConfig,
} from '@/lib/adverb-types'
import { CATEGORY_LABELS } from '@/lib/vocab/category-labels'
import {
  addToken,
  compareToTarget,
  isDynamicGestureWord,
  removeTokenAt,
  resetTokens,
  validateSentenceSyntax,
  type SentenceToken,
} from '@/lib/vocab/sentence-composer'

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
  | { state: 'loading'; word: string }
  | { state: 'found'; word: WordResult }
  | {
      state: 'fallback'
      gestureInput: string
      suggestedWord: string | null
      explanation: string
    }
  | { state: 'error'; word: string }

const TOP_LEVEL_SECTIONS = [
  {
    id: 'abstrak',
    title: 'Kata Abstrak',
    shortDescription: 'Kata sifat, hubungan, dan keterangan.',
    info: 'Gunakan mode ini untuk mempelajari kata yang menjelaskan sifat, keadaan, hubungan, atau keterangan.',
    icon: BookOpen,
  },
  {
    id: 'konkrit',
    title: 'Kata Konkret',
    shortDescription: 'Benda, hewan, dan lingkungan.',
    info: 'Gunakan mode ini untuk mempelajari kata yang dapat dilihat secara langsung, seperti benda, hewan, dan alam.',
    icon: Box,
  },
  {
    id: 'kalimat',
    title: 'Kalimat',
    shortDescription: 'Susun kata menjadi kalimat.',
    info: 'Gunakan mode ini untuk menyusun kata hasil isyarat menjadi kalimat yang benar.',
    icon: MessageCircle,
  },
] as const

const KONKRIT_CATEGORIES = [
  {
    id: 'benda',
    title: 'Benda',
    description: 'Kosakata benda sehari-hari.',
    info: 'Berisi kosakata benda yang sering dijumpai dalam kegiatan sehari-hari.',
    icon: Box,
  },
  {
    id: 'hewan',
    title: 'Hewan',
    description: 'Kosakata berbagai jenis hewan.',
    info: 'Berisi kosakata nama hewan dan latihan isyaratnya.',
    icon: PawPrint,
  },
  {
    id: 'alam',
    title: 'Alam',
    description: 'Kosakata alam dan lingkungan.',
    info: 'Berisi kosakata yang berkaitan dengan alam, tanaman, dan lingkungan.',
    icon: Leaf,
  },
] as const

type Section = (typeof TOP_LEVEL_SECTIONS)[number]['id']
type ConcreteCategory = (typeof KONKRIT_CATEGORIES)[number]['id']
type Level = 'dasar' | 'lanjut'

interface ExampleSentence {
  id: string
  text: string
  description: string
  words: string[]
  level: Level
  Illustration: ComponentType | null
}

const EXAMPLE_SENTENCES: ExampleSentence[] = [
  {
    id: 'pohon-yang-besar',
    text: 'Pohon yang besar',
    description: 'Pohon besar itu jauh lebih tinggi dan lebar dibanding pohon kecil di sebelahnya.',
    words: ['pohon', 'yang', 'besar'],
    level: 'dasar',
    Illustration: SentenceTreeSizeCard,
  },
  {
    id: 'kucing-dan-gajah',
    text: 'Kucing dan gajah',
    description: 'Kalimat ini menggabungkan dua nama hewan menggunakan kata penghubung “dan”.',
    words: ['kucing', 'dan', 'gajah'],
    level: 'dasar',
    Illustration: SentenceCombinationCard,
  },
  {
    id: 'kucing-kecil-gajah-besar',
    text: 'Kucing yang kecil dan gajah yang besar',
    description: 'Kalimat lanjutan yang membandingkan ukuran dua hewan.',
    words: ['kucing', 'yang', 'kecil', 'dan', 'gajah', 'yang', 'besar'],
    level: 'lanjut',
    Illustration: SentenceComboSizeCard,
  },
  {
    id: 'apel-besar-jeruk-kecil',
    text: 'Apel yang besar dan jeruk yang kecil',
    description: 'Kalimat lanjutan yang membandingkan ukuran dua buah.',
    words: ['apel', 'yang', 'besar', 'dan', 'jeruk', 'yang', 'kecil'],
    level: 'lanjut',
    Illustration: SentenceFruitSizeCard,
  },
]

function buildSyntheticDynamicWord(text: string, category: string): WordResult {
  return {
    id: `synthetic-${category}-${text}`,
    text,
    category,
    word_type: category === 'kata_keterangan' ? 'abstrak' : 'konkret',
    image_url: null,
    comparison: null,
    adverb_subcategory: null,
    slider_config: null,
    timeline_config: null,
    certainty_config: null,
    gauge_config: null,
  }
}

function normalizeRawWord(raw: string) {
  return raw.toLowerCase().trim().replace(/_/g, ' ')
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function InfoHint({ title, description, label }: { title: string; description: string; label?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label ?? `Informasi tentang ${title}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2 text-base leading-7 text-slate-600">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Mengerti</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PanelHeader({
  eyebrow,
  title,
  infoTitle,
  infoDescription,
  action,
}: {
  eyebrow?: string
  title: string
  infoTitle: string
  infoDescription: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">{eyebrow}</p> : null}
        <div className="mt-1 flex items-center gap-1">
          <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">{title}</h2>
          <InfoHint title={infoTitle} description={infoDescription} />
        </div>
      </div>
      {action}
    </div>
  )
}

export default function NewVocabPage() {
  const [section, setSection] = useState<Section>('abstrak')
  const [konkritCategory, setKonkritCategory] = useState<ConcreteCategory>('benda')
  const [mode, setMode] = useState<'explore' | 'quiz'>('explore')
  const [result, setResult] = useState<LookupResult>({ state: 'idle' })
  const [retryCount, setRetryCount] = useState(0)
  const [manualWord, setManualWord] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [sentenceLevel, setSentenceLevel] = useState<Level>('dasar')
  const [selectedSentenceId, setSelectedSentenceId] = useState(EXAMPLE_SENTENCES[0].id)
  const [tokens, setTokens] = useState<SentenceToken[]>([])
  const [checked, setChecked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentCategory = section === 'abstrak' ? 'kata_keterangan' : section === 'konkrit' ? konkritCategory : null

  const currentCategoryLabel =
    section === 'kalimat'
      ? 'Contoh Kalimat'
      : currentCategory
        ? (CATEGORY_LABELS[currentCategory] ?? currentCategory)
        : ''

  const levelSentences = useMemo(
    () => EXAMPLE_SENTENCES.filter((sentence) => sentence.level === sentenceLevel),
    [sentenceLevel],
  )

  const practiceSentence = useMemo(
    () =>
      levelSentences.find((sentence) => sentence.id === selectedSentenceId) ??
      levelSentences[0] ??
      EXAMPLE_SENTENCES[0],
    [levelSentences, selectedSentenceId],
  )

  const targetWords = practiceSentence.words

  const wordResults = useMemo(
    () =>
      checked
        ? compareToTarget(
            tokens.map((token) => token.word),
            targetWords,
          )
        : null,
    [checked, targetWords, tokens],
  )

  const syntaxCheck = useMemo(() => (checked ? validateSentenceSyntax(tokens) : null), [checked, tokens])

  const readyToCheck = tokens.length === targetWords.length
  const canCheck = readyToCheck && !checked
  const sentenceIsCorrect =
    checked && Boolean(syntaxCheck?.valid) && Boolean(wordResults?.every((item) => item.correct))

  const currentSentenceIndex = levelSentences.findIndex((sentence) => sentence.id === practiceSentence.id)
  const hasPreviousSentence = currentSentenceIndex > 0
  const hasNextSentence = currentSentenceIndex >= 0 && currentSentenceIndex < levelSentences.length - 1

  const resetSentenceComposer = useCallback(() => {
    setTokens(resetTokens())
    setChecked(false)
  }, [])

  const handleSectionChange = useCallback(
    (nextSection: Section) => {
      setSection(nextSection)
      setMode('explore')
      setResult({ state: 'idle' })
      setRetryCount(0)
      setManualWord('')

      if (nextSection === 'kalimat') {
        resetSentenceComposer()
      }
    },
    [resetSentenceComposer],
  )

  const handleConcreteCategoryChange = useCallback((category: ConcreteCategory) => {
    setKonkritCategory(category)
    setMode('explore')
    setResult({ state: 'idle' })
    setRetryCount(0)
  }, [])

  const handleLevelChange = useCallback(
    (level: Level) => {
      const firstSentence = EXAMPLE_SENTENCES.find((sentence) => sentence.level === level)
      setSentenceLevel(level)
      if (firstSentence) setSelectedSentenceId(firstSentence.id)
      resetSentenceComposer()
    },
    [resetSentenceComposer],
  )

  const handleSentenceChange = useCallback(
    (sentenceId: string) => {
      setSelectedSentenceId(sentenceId)
      resetSentenceComposer()
    },
    [resetSentenceComposer],
  )

  const handleWordFormed = useCallback(
    (word: string, source: 'manual' | 'gesture' = 'manual') => {
      if (!word.trim()) return

      const normalized = normalizeRawWord(word)

      if (section === 'kalimat') {
        setTokens((previousTokens) => {
          if (checked || previousTokens.length >= practiceSentence.words.length) {
            return previousTokens
          }

          return addToken(previousTokens, {
            word: normalized,
            category: null,
          })
        })
        return
      }

      if (!currentCategory) return

      if (isDynamicGestureWord(normalized)) {
        setResult({
          state: 'found',
          word: buildSyntheticDynamicWord(normalized, currentCategory),
        })
        setRetryCount(0)
        return
      }

      if (source === 'gesture') {
        setResult({ state: 'pending', word: normalized, suggestedWord: null, explanation: null })
      } else {
        setResult({ state: 'loading', word: normalized })
      }

      void (async () => {
        try {
          const lookupResponse = await fetch(
            `/api/v1/vocab/lookup?word=${encodeURIComponent(normalized)}&category=${encodeURIComponent(currentCategory)}`,
          )

          if (!lookupResponse.ok) throw new Error('Lookup failed')

          const lookupData = await lookupResponse.json()

          if (lookupData.found && lookupData.word) {
            setResult({ state: 'found', word: lookupData.word })
            setRetryCount(0)
            return
          }

          const fallbackResponse = await fetch('/api/v1/vocab/fallback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gesture_input: normalized,
              category: currentCategory,
            }),
          })

          if (!fallbackResponse.ok) throw new Error('Fallback failed')

          const fallbackData = await fallbackResponse.json()

          if (source === 'gesture') {
            setResult({
              state: 'pending',
              word: normalized,
              suggestedWord: fallbackData.suggested_word ?? null,
              explanation: fallbackData.explanation ?? null,
            })
          } else {
            setResult({
              state: 'fallback',
              gestureInput: normalized,
              suggestedWord: fallbackData.suggested_word ?? null,
              explanation: fallbackData.explanation,
            })
          }
          setRetryCount(0)
        } catch {
          if (source === 'gesture') {
            setResult({ state: 'pending', word: normalized, suggestedWord: null, explanation: null })
          } else {
            setResult({ state: 'error', word: normalized })
          }
        }
      })()
    },
    [checked, currentCategory, practiceSentence.words.length, section],
  )

  const handleManualSubmit = useCallback(() => {
    const value = manualWord.trim()
    if (!value) return

    handleWordFormed(value, 'manual')
    setManualWord('')
    inputRef.current?.focus()
  }, [handleWordFormed, manualWord])

  const handleTrySuggested = useCallback(
    (word: string) => {
      handleWordFormed(word, 'manual')
    },
    [handleWordFormed],
  )

  const handleRetry = useCallback(() => {
    if (retryCount >= 3) return
    setRetryCount((count) => count + 1)
    setResult({ state: 'idle' })
  }, [retryCount])

  const handleRemoveToken = useCallback(
    (index: number) => {
      if (checked) return
      setTokens((previousTokens) => removeTokenAt(previousTokens, index))
    },
    [checked],
  )

  const goToPreviousSentence = useCallback(() => {
    if (!hasPreviousSentence) return
    const previousSentence = levelSentences[currentSentenceIndex - 1]
    if (previousSentence) handleSentenceChange(previousSentence.id)
  }, [currentSentenceIndex, handleSentenceChange, hasPreviousSentence, levelSentences])

  const goToNextSentence = useCallback(() => {
    if (!hasNextSentence) return
    const nextSentence = levelSentences[currentSentenceIndex + 1]
    if (nextSentence) handleSentenceChange(nextSentence.id)
  }, [currentSentenceIndex, handleSentenceChange, hasNextSentence, levelSentences])

  const renderInteractionCard = () => {
    if (result.state !== 'found') return null

    const word = normalizeRawWord(result.word.text)

    if (result.word.word_type === 'konkret') {
      return (
        <ConcreteWordCard word={result.word.text} imageUrl={result.word.image_url} category={result.word.category} />
      )
    }

    if (result.word.word_type === 'abstrak') {
      const isStaticCardWord =
        word === 'besar' || word === 'kecil' || word === 'sangat' || word === 'yang' || word === 'dan'

      if (isStaticCardWord && result.word.category === 'kata_keterangan') {
        if (word === 'besar' || word === 'kecil') {
          return <SizeContrastCard word={result.word.text} category={result.word.category} />
        }
        if (word === 'sangat') {
          return <IntensityCard word={result.word.text} category={result.word.category} />
        }
        if (word === 'yang') {
          return <SelectionCard word={result.word.text} category={result.word.category} />
        }
        if (word === 'dan') {
          return <CombinationCard word={result.word.text} category={result.word.category} />
        }
      }

      if (word === 'belajar') {
        return <BelajarCard word={result.word.text} category={result.word.category} />
      }
      if (word === 'maaf') {
        return <MaafCard word={result.word.text} category={result.word.category} />
      }
      if (word === 'seperti') {
        return <SepertiCard word={result.word.text} category={result.word.category} />
      }
      if (word === 'terima kasih') {
        return <TerimaKasihCard word={result.word.text} category={result.word.category} />
      }
      if (word === 'tolong') {
        return <TolongCard word={result.word.text} category={result.word.category} />
      }

      const interactionType = getInteractionComponent(result.word.category, result.word.adverb_subcategory)

      if (interactionType === 'intensity-slider' && result.word.slider_config) {
        return (
          <IntensitySlider
            word={result.word.text}
            config={result.word.slider_config}
            comparison={result.word.comparison}
            category={result.word.category}
          />
        )
      }

      if (interactionType === 'timeline-animation' && result.word.timeline_config) {
        return (
          <TimelineAnimation
            word={result.word.text}
            config={result.word.timeline_config}
            category={result.word.category}
          />
        )
      }

      if (interactionType === 'certainty-dial' && result.word.certainty_config) {
        return (
          <CertaintyDial
            word={result.word.text}
            config={result.word.certainty_config}
            category={result.word.category}
          />
        )
      }

      if (interactionType === 'sensation-gauge' && result.word.gauge_config) {
        return (
          <SensationGauge word={result.word.text} config={result.word.gauge_config} category={result.word.category} />
        )
      }

      if (result.word.comparison) {
        return (
          <AbstractComparison
            word={result.word.text}
            lowImageUrl={result.word.comparison.low_image_url}
            highImageUrl={result.word.comparison.high_image_url}
            lowLabel={result.word.comparison.low_label}
            highLabel={result.word.comparison.high_label}
            category={result.word.category}
            referenceWord={result.word.comparison.reference_word}
          />
        )
      }
    }

    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-bold tracking-[0.18em] text-emerald-700 uppercase">Kata dikenali</p>
        <p className="mt-2 text-3xl font-black text-emerald-900">{titleCase(result.word.text)}</p>
      </div>
    )
  }

  const renderWordLearningPanel = () => {
    if (mode === 'quiz' && currentCategory) {
      return (
        <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,118,70,0.08)] sm:p-6">
          <PanelHeader
            eyebrow="Mode latihan"
            title={`Kuis ${currentCategoryLabel}`}
            infoTitle="Mode Kuis"
            infoDescription="Jawab latihan interaktif berdasarkan kategori yang sedang aktif. Kamera tetap tersedia di sebelah kiri."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode('explore')}
                className="rounded-full"
              >
                <Play className="h-4 w-4" />
                Kembali Belajar
              </Button>
            }
          />

          <div className="mt-5">
            {currentCategory === 'kata_keterangan' ? (
              <DragDropQuiz category={currentCategory} onExit={() => setMode('explore')} />
            ) : (
              <ImageMatchQuiz category={currentCategory} onExit={() => setMode('explore')} />
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,118,70,0.08)] sm:p-6">
        <PanelHeader
          eyebrow="Materi aktif"
          title={currentCategoryLabel}
          infoTitle={`Materi ${currentCategoryLabel}`}
          infoDescription="Hasil isyarat atau kata yang diketik akan ditampilkan sebagai materi interaktif di bagian ini."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode('quiz')}
              className="rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              <Gamepad2 className="h-4 w-4" />
              Mode Kuis
            </Button>
          }
        />

        <div className="mt-5 flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
          {result.state === 'idle' ? (
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] bg-emerald-100 text-emerald-700 shadow-inner">
                <Hand className="h-12 w-12" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-900">Ayo tunjukkan isyaratmu</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Peragakan isyarat di kamera atau ketik kata pada kolom di bawah kamera.
              </p>
            </div>
          ) : null}

          {result.state === 'loading' ? (
            <div className="flex flex-col items-center gap-4 text-emerald-700">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              <p className="font-semibold">Mencari materi untuk “{titleCase(result.word)}”...</p>
            </div>
          ) : null}

          {result.state === 'pending' ? (
            <div className="w-full">
              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center shadow-sm">
                <p className="text-sm font-bold tracking-[0.18em] text-amber-700 uppercase">Kata terdeteksi</p>
                <p className="mt-2 text-3xl font-black text-amber-900">{titleCase(result.word)}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => handleWordFormed(result.suggestedWord ?? result.word, 'manual')}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Cari
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResult({ state: 'idle' })}
                    className="rounded-full"
                  >
                    Batal
                  </Button>
                </div>
                {result.suggestedWord ? (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-800">
                    <span className="font-semibold">Maksud kamu:</span>
                    <button
                      type="button"
                      onClick={() => handleWordFormed(result.suggestedWord ?? result.word, 'manual')}
                      className="rounded-full bg-amber-100 px-3 py-1 font-black text-amber-800 transition hover:bg-amber-200"
                    >
                      {result.suggestedWord}
                    </button>
                  </div>
                ) : null}
                {result.explanation ? (
                  <p className="mt-4 text-sm leading-6 text-amber-800">{result.explanation}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {result.state === 'found' ? <div className="w-full">{renderInteractionCard()}</div> : null}

          {result.state === 'fallback' ? (
            <div className="w-full">
              <AIFallbackCard
                suggestedWord={result.suggestedWord}
                explanation={result.explanation}
                onTrySuggested={handleTrySuggested}
              />
            </div>
          ) : null}

          {result.state === 'error' ? (
            <div className="max-w-sm rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center">
              <p className="text-lg font-black text-rose-800">Kata belum dapat diproses</p>
              <p className="mt-2 text-sm leading-6 text-rose-700">
                Periksa koneksi lalu coba ulang kata “{titleCase(result.word)}”.
              </p>
              {retryCount < 3 ? (
                <Button type="button" onClick={handleRetry} className="mt-5 rounded-full bg-rose-600 hover:bg-rose-700">
                  Coba Lagi
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  const renderSentencePanel = () => {
    const Illustration = practiceSentence.Illustration

    return (
      <div className="space-y-4">
        <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_12px_35px_rgba(15,118,70,0.08)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                <h2 className="text-2xl font-black text-slate-900">{practiceSentence.text}</h2>
                <InfoHint
                  title="Kalimat latihan"
                  description="Perhatikan contoh kalimat, kemudian masukkan setiap kata melalui isyarat atau input manual."
                />
              </div>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                Level {practiceSentence.level === 'dasar' ? 'Dasar' : 'Lanjut'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goToPreviousSentence}
                disabled={!hasPreviousSentence}
                aria-label="Kalimat sebelumnya"
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goToNextSentence}
                disabled={!hasNextSentence}
                aria-label="Kalimat berikutnya"
                className="rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-50 bg-gradient-to-br from-emerald-50 to-white p-3">
            {Illustration ? (
              <Illustration />
            ) : (
              <div className="flex min-h-48 flex-wrap items-center justify-center gap-2 p-6">
                {practiceSentence.words.map((word, index) => (
                  <span
                    key={`${word}-${index}`}
                    className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-sm leading-6 text-blue-700">{practiceSentence.description}</p>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-lg font-black text-slate-900">Susun ulang: “{practiceSentence.text}”</h3>
                <InfoHint
                  title="Susun ulang kalimat"
                  description="Masukkan kata sesuai urutan kalimat. Tekan kata pada bagian Susunanmu untuk menghapusnya."
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {tokens.length} dari {targetWords.length} kata sudah dimasukkan
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={resetSentenceComposer} className="rounded-full">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1">
              <p className="text-sm font-bold text-slate-800">Susunanmu</p>
              <InfoHint
                title="Susunanmu"
                description="Kata hasil isyarat dan input manual akan masuk ke area ini sesuai urutan."
              />
            </div>

            <div className="min-h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3">
              {tokens.length === 0 ? (
                <div className="flex min-h-20 items-center justify-center text-center text-sm text-slate-400">
                  Isyaratkan atau ketik kata untuk mulai menyusun kalimat.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tokens.map((token, index) => {
                    const itemResult = wordResults?.[index]
                    const stateClass = checked
                      ? itemResult?.correct
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50'

                    return (
                      <button
                        key={`${token.word}-${index}`}
                        type="button"
                        onClick={() => handleRemoveToken(index)}
                        disabled={checked}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${stateClass}`}
                        title={checked ? undefined : 'Klik untuk menghapus kata'}
                      >
                        {token.word}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {checked ? (
            <div
              className={`mt-4 rounded-2xl p-4 text-sm font-semibold ${
                sentenceIsCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
              }`}
              role="status"
            >
              {sentenceIsCorrect
                ? 'Hebat! Susunan kalimatmu sudah benar.'
                : (syntaxCheck?.reason ?? 'Masih ada kata yang belum sesuai. Tekan Reset lalu coba lagi.')}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              onClick={() => setChecked(true)}
              disabled={!canCheck}
              className="rounded-full bg-emerald-600 px-5 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
              Periksa Susunan
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
              <Hand className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-black text-emerald-900">Cara menyusun kalimat</h3>
                <InfoHint
                  title="Cara menyusun kalimat"
                  description="Peragakan isyarat kata demi kata, atau ketik kata secara manual. Periksa susunan setelah semua kata terisi."
                />
              </div>
              <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                Peragakan isyarat kata demi kata atau ketik manual, lalu susun urutannya menjadi kalimat yang benar.
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f8fbf8] pb-36 text-slate-900 selection:bg-emerald-200">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-50 to-transparent" />
      <div className="pointer-events-none absolute top-16 right-[-120px] h-80 w-80 rounded-full bg-lime-100/70 blur-3xl" />
      <div className="pointer-events-none absolute top-[520px] left-[-120px] h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl" />

      <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)_240px] lg:px-8">
          <div className="flex items-center justify-between lg:justify-start">
            <Link
              href="/"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              Beranda
            </Link>

            <div className="lg:hidden">
              <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="rounded-full">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Buka panduan</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Panduan PENSYARAT</DialogTitle>
                    <DialogDescription>
                      Pilih mode, nyalakan kamera, lalu peragakan isyarat atau masukkan kata secara manual.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm leading-6 text-slate-700">
                    <p>
                      <strong>Kata Abstrak:</strong> belajar kata sifat, hubungan, dan keterangan.
                    </p>
                    <p>
                      <strong>Kata Konkret:</strong> belajar kosakata benda, hewan, dan alam.
                    </p>
                    <p>
                      <strong>Kalimat:</strong> susun hasil isyarat menjadi kalimat sesuai level.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={() => setGuideOpen(false)}>
                      Tutup
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <fieldset className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
            <legend className="mx-auto flex items-center gap-1 px-3 text-center text-xs font-bold tracking-[0.14em] text-slate-600 uppercase">
              Pilih Mode Penerjemahan
              <InfoHint
                title="Mode Penerjemahan"
                description="Pilih jenis materi yang ingin digunakan. Pergantian mode tidak memuat ulang halaman dan tidak mematikan kamera."
              />
            </legend>

            <div className="grid gap-2 sm:grid-cols-3">
              {TOP_LEVEL_SECTIONS.map((option) => {
                const Icon = option.icon
                const active = section === option.id
                const isFeatured = option.id === 'abstrak'

                return (
                  <div key={option.id} className="relative min-w-0">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSectionChange(option.id)}
                      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border px-4 pr-11 text-sm font-extrabold transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        active
                          ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : isFeatured
                            ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-white text-emerald-800 shadow-sm ring-1 ring-emerald-100'
                            : 'border-transparent bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{option.title}</span>
                      {isFeatured ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.18em] uppercase ${
                            active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Utama
                        </span>
                      ) : null}
                      {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                    </button>
                    <div className="absolute top-1/2 right-2 -translate-y-1/2">
                      <InfoHint title={option.title} description={option.info} />
                    </div>
                  </div>
                )
              })}
            </div>
          </fieldset>

          <div className="hidden items-center justify-end gap-2 lg:flex">
            {/* w */}

            <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                >
                  <Info className="h-4 w-4" />
                  Panduan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Panduan PENSYARAT</DialogTitle>
                  <DialogDescription>Seluruh mode vocab lama tetap tersedia dalam satu halaman baru.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm leading-6 text-slate-700">
                  <p>
                    <strong>Kata Abstrak:</strong> gunakan kamera atau input manual untuk membuka materi interaktif.
                  </p>
                  <p>
                    <strong>Kata Konkret:</strong> pilih kategori Benda, Hewan, atau Alam sebelum mulai.
                  </p>
                  <p>
                    <strong>Kalimat:</strong> pilih level dan kalimat, lalu masukkan setiap kata secara berurutan.
                  </p>
                  <p>
                    <strong>Mode Kuis:</strong> tetap tersedia pada mode Kata Abstrak dan Kata Konkret.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={() => setGuideOpen(false)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        {section === 'konkrit' ? (
          <section className="mb-5 rounded-[28px] border border-emerald-100 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,118,70,0.07)] sm:p-5">
            <PanelHeader
              eyebrow="Kata Konkret"
              title="Pilih Kategori Konkret"
              infoTitle="Kategori Kata Konkret"
              infoDescription="Pilih Benda, Hewan, atau Alam. Materi, kuis, dan pencarian kata akan menyesuaikan kategori aktif."
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {KONKRIT_CATEGORIES.map((category) => {
                const Icon = category.icon
                const active = konkritCategory === category.id

                return (
                  <div key={category.id} className="relative">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleConcreteCategoryChange(category.id)}
                      className={`flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border p-4 pr-11 text-center transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60'
                      }`}
                    >
                      <Icon className="h-7 w-7" aria-hidden="true" />
                      <span className="mt-2 font-black">{category.title}</span>
                      <span className="mt-1 text-xs font-medium opacity-75">{category.description}</span>
                    </button>
                    <div className="absolute top-2 right-2">
                      <InfoHint title={category.title} description={category.info} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {section === 'kalimat' ? (
          <section className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-emerald-100 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,118,70,0.07)] sm:p-5">
              <PanelHeader
                eyebrow="Tahap 1"
                title="Pilih Level"
                infoTitle="Level Kalimat"
                infoDescription="Level Dasar berisi kalimat pendek. Level Lanjut berisi susunan kata yang lebih panjang."
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                {(['dasar', 'lanjut'] as const).map((level) => {
                  const active = sentenceLevel === level
                  const Icon = level === 'dasar' ? Star : BarChart3

                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleLevelChange(level)}
                      className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {level === 'dasar' ? 'Dasar' : 'Lanjut'}
                      {active ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,118,70,0.07)] sm:p-5">
              <PanelHeader
                eyebrow="Tahap 2"
                title="Pilih Kalimat"
                infoTitle="Pilihan Kalimat"
                infoDescription="Setiap level memiliki dua latihan. Pilih salah satu kalimat sebelum mulai menyusun kata."
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                {levelSentences.map((sentence, index) => {
                  const active = practiceSentence.id === sentence.id

                  return (
                    <button
                      key={sentence.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSentenceChange(sentence.id)}
                      className={`min-h-14 rounded-2xl border px-4 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {active ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                        Kalimat {index + 1}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[30px] border-2 border-emerald-500 bg-white shadow-[0_18px_45px_rgba(15,118,70,0.13)]">
              <div className="min-h-[420px] bg-slate-950/5 p-2 sm:min-h-[500px]">
                <GestureRecognition
                  onWordFormed={(word) => handleWordFormed(word, 'gesture')}
                  enableWordFormation={mode === 'explore'}
                  showAlternatives={false}
                  letterMapping={{}}
                />
              </div>
            </section>

            {/* <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="flex items-center gap-1">
                <p className="text-xs font-black tracking-[0.16em] text-blue-700 uppercase">Kata yang terbentuk</p>
                <InfoHint
                  title="Kata yang terbentuk"
                  description="Kata terakhir yang dikenali kamera atau dimasukkan secara manual akan muncul di sini."
                />
              </div>

              <div className="mt-3 flex min-h-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-4 text-center">
                {formedWord ? (
                  <span className="text-xl font-black text-emerald-800">{titleCase(formedWord)}</span>
                ) : (
                  <span className="text-sm font-medium text-slate-400">Isyaratkan sesuatu...</span>
                )}
              </div>
            </section> */}

            <section className="rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                  <Keyboard className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <label htmlFor="manual-word" className="sr-only">
                    {section === 'kalimat' ? 'Tambah kata atau kalimat' : 'Cari kata'}
                  </label>
                  <Input
                    id="manual-word"
                    ref={inputRef}
                    value={manualWord}
                    onChange={(event) => setManualWord(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleManualSubmit()
                    }}
                    placeholder={
                      section === 'kalimat'
                        ? 'Ketik kata untuk ditambahkan ke susunan...'
                        : 'Ketik kata yang ingin dipelajari...'
                    }
                    className="h-12 border-0 bg-slate-50 text-base font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>

                <InfoHint
                  title="Input manual"
                  description={
                    section === 'kalimat'
                      ? 'Ketik satu kata lalu tekan Tambah. Kata tersebut akan masuk ke Susunanmu.'
                      : 'Ketik kata lalu tekan Cari untuk membuka materi tanpa menggunakan kamera.'
                  }
                />

                <Button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={
                    !manualWord.trim() || (section !== 'kalimat' && result.state === 'loading') || mode === 'quiz'
                  }
                  className="h-12 shrink-0 rounded-full bg-emerald-600 px-5 font-black text-white hover:bg-emerald-700"
                >
                  {section === 'kalimat' ? (
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Tambah</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">Cari</span>
                    </>
                  )}
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {section === 'kalimat' ? renderSentencePanel() : renderWordLearningPanel()}

            {section !== 'kalimat' && mode === 'explore' ? (
              <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                    <Lightbulb className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-black text-emerald-900">Tips agar hasil lebih akurat</h3>
                      <InfoHint
                        title="Tips penggunaan"
                        description="Gunakan pencahayaan yang cukup, jaga tangan tetap berada di dalam bingkai, dan lakukan isyarat dengan jelas."
                      />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                      Pastikan tangan terlihat jelas, kamera tidak bergoyang, dan latar tidak terlalu gelap.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-cover bg-bottom bg-no-repeat sm:h-40"
        style={{ backgroundImage: "url('/assets/foother_play.png')" }}
      />
    </div>
  )
}
