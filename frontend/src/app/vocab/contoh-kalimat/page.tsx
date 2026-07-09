'use client'

import { useCallback, useMemo, useRef, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Keyboard, RotateCcw, X } from 'lucide-react'
import { GestureRecognition } from '@/components/gesture/gesture-recognition'
import { WordChip } from '@/components/vocab/WordChip'
import { SentenceTreeSizeCard } from '@/components/vocab/SentenceTreeSizeCard'
import { SentenceCombinationCard } from '@/components/vocab/SentenceCombinationCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  addToken,
  compareToTarget,
  removeTokenAt,
  resetTokens,
  validateSentenceSyntax,
  type SentenceToken,
} from '@/lib/vocab/sentence-composer'

type Level = 'dasar' | 'lanjut'

interface ExampleSentence {
  id: string
  text: string
  words: string[]
  level: Level
  Illustration: ComponentType | null
}

const EXAMPLE_SENTENCES: ExampleSentence[] = [
  {
    id: 'pohon-yang-besar',
    text: 'Pohon yang besar',
    words: ['pohon', 'yang', 'besar'],
    level: 'dasar',
    Illustration: SentenceTreeSizeCard,
  },
  {
    id: 'kucing-dan-gajah',
    text: 'Kucing dan gajah',
    words: ['kucing', 'dan', 'gajah'],
    level: 'dasar',
    Illustration: SentenceCombinationCard,
  },
  {
    id: 'kucing-besar-gajah-kecil',
    text: 'Kucing yang besar dan gajah yang kecil',
    words: ['kucing', 'yang', 'besar', 'dan', 'gajah', 'yang', 'kecil'],
    level: 'lanjut',
    Illustration: null,
  },
]

type View = { mode: 'gallery'; level: Level } | { mode: 'practice'; sentence: ExampleSentence }

function normalizeWord(raw: string): string {
  return raw.toLowerCase().trim().replace(/_/g, ' ')
}

export default function VocabContohKalimatPage() {
  const [view, setView] = useState<View>({ mode: 'gallery', level: 'dasar' })
  const [tokens, setTokens] = useState<SentenceToken[]>([])
  const [checked, setChecked] = useState(false)
  const [manualWord, setManualWord] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const targetWords = useMemo(() => (view.mode === 'practice' ? view.sentence.words : []), [view])
  const PracticeIllustration = view.mode === 'practice' ? view.sentence.Illustration : null

  const wordResults = useMemo(
    () =>
      checked
        ? compareToTarget(
            tokens.map((t) => t.word),
            targetWords,
          )
        : null,
    [checked, tokens, targetWords],
  )
  const syntaxCheck = useMemo(() => (checked ? validateSentenceSyntax(tokens) : null), [checked, tokens])

  const readyToCheck = view.mode === 'practice' && tokens.length === view.sentence.words.length
  const canCheck = readyToCheck && !checked
  const composingLocked = checked || readyToCheck
  const allCorrect = wordResults !== null && wordResults.every((r) => r.correct) && (syntaxCheck?.valid ?? true)

  const enterPractice = (sentence: ExampleSentence) => {
    setTokens(resetTokens())
    setChecked(false)
    setManualWord('')
    setView({ mode: 'practice', sentence })
  }

  const backToGallery = (level: Level) => {
    setView({ mode: 'gallery', level })
  }

  const addWord = useCallback(
    (rawWord: string) => {
      if (view.mode !== 'practice' || checked) return
      if (tokens.length >= view.sentence.words.length) return
      const normalized = normalizeWord(rawWord)
      if (!normalized) return
      setTokens((prev) => addToken(prev, { word: normalized, category: null }))
    },
    [view, tokens.length, checked],
  )

  const handleWordFormed = useCallback((word: string) => addWord(word), [addWord])

  const handleManualSubmit = () => {
    if (manualWord.trim()) {
      addWord(manualWord.trim())
      setManualWord('')
      inputRef.current?.focus()
    }
  }

  const handleRemoveToken = (index: number) => {
    if (checked) return
    setTokens((prev) => removeTokenAt(prev, index))
  }

  const handleReset = () => {
    setTokens(resetTokens())
    setChecked(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 selection:bg-emerald-200">
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/4 rounded-full bg-amber-200/40 mix-blend-multiply blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-emerald-200/40 mix-blend-multiply blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/vocab"
            className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-emerald-600 hover:shadow"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <div className="rounded-full bg-white/50 px-5 py-2 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md">
            <h1 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Contoh Kalimat</h1>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-8">
          {view.mode === 'gallery' ? (
            <>
              <p className="mb-8 max-w-2xl text-slate-600">Pilih level, lalu latih susunan kalimatmu lewat kamera.</p>
              <Tabs value={view.level} onValueChange={(level) => setView({ mode: 'gallery', level: level as Level })}>
                <TabsList>
                  <TabsTrigger value="dasar">Level Dasar</TabsTrigger>
                  <TabsTrigger value="lanjut">Level Lanjut</TabsTrigger>
                </TabsList>
                {(['dasar', 'lanjut'] as const).map((level) => (
                  <TabsContent key={level} value={level}>
                    <div className="grid grid-cols-1 gap-8 pt-6 sm:grid-cols-2">
                      {EXAMPLE_SENTENCES.filter((s) => s.level === level).map((sentence) => {
                        const Illustration = sentence.Illustration
                        return (
                          <button
                            key={sentence.id}
                            onClick={() => enterPractice(sentence)}
                            className="flex flex-col items-center gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 text-left shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
                          >
                            {Illustration ? (
                              <Illustration />
                            ) : (
                              <div className="flex w-full flex-wrap justify-center gap-2 rounded-2xl bg-slate-50 p-6">
                                {sentence.words.map((w, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-900/5"
                                  >
                                    {w}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-center text-lg font-bold text-slate-800">{sentence.text}</p>
                            <span className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-sm">
                              Latih →
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-7">
                <button
                  onClick={() => backToGallery(view.sentence.level)}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/5 transition-all hover:text-emerald-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke galeri
                </button>

                <div className="min-h-[400px] flex-grow overflow-hidden rounded-[2.5rem] bg-slate-50 p-2 shadow-inner ring-1 ring-black/5">
                  <GestureRecognition
                    onWordFormed={handleWordFormed}
                    enableWordFormation={true}
                    showAlternatives={false}
                  />
                </div>

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
                      placeholder="Ketik kata..."
                      disabled={composingLocked}
                      className="h-12 border-0 bg-transparent text-lg font-medium text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      onClick={handleManualSubmit}
                      disabled={!manualWord.trim() || composingLocked}
                      className="h-12 rounded-full bg-emerald-500 px-6 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative flex h-full min-h-[400px] flex-col gap-4 overflow-hidden rounded-3xl border border-slate-100 bg-white/50 p-6 shadow-sm lg:col-span-5">
                <div className="flex flex-col items-center gap-3 border-b border-slate-100 pb-4">
                  {PracticeIllustration ? (
                    <PracticeIllustration />
                  ) : (
                    <div className="flex flex-wrap justify-center gap-2">
                      {targetWords.map((w, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-center text-lg font-black text-slate-800">
                    Susun ulang: &ldquo;{view.sentence.text}&rdquo;
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">Susunanmu</h2>
                  <Button
                    onClick={handleReset}
                    disabled={tokens.length === 0}
                    variant="outline"
                    className="h-9 rounded-full px-4 text-sm font-bold shadow-sm disabled:opacity-40"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>

                {tokens.length === 0 ? (
                  <div className="flex flex-grow flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-100/50 text-6xl shadow-inner ring-1 ring-emerald-200">
                      ✋
                    </div>
                    <p className="text-base leading-relaxed font-medium text-slate-500">
                      Peragakan isyarat kata demi kata, atau ketik manual, untuk menyusun ulang kalimat ini.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tokens.map((token, index) => (
                      <WordChip
                        key={`${token.word}-${index}`}
                        word={token.word}
                        category={token.category}
                        onRemove={() => handleRemoveToken(index)}
                        status={wordResults ? (wordResults[index]?.correct ? 'correct' : 'incorrect') : undefined}
                      />
                    ))}
                  </div>
                )}

                {canCheck && (
                  <Button
                    onClick={() => setChecked(true)}
                    className="h-12 rounded-full bg-emerald-500 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-emerald-600"
                  >
                    Cek Jawaban
                  </Button>
                )}

                {checked && (
                  <div
                    className={`flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm font-medium ring-1 ${
                      allCorrect
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-red-50 text-red-600 ring-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {allCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>
                        {allCorrect ? 'Betul! Kalimatmu sudah tepat.' : 'Masih ada kata yang belum tepat urutannya.'}
                      </span>
                    </div>
                    {syntaxCheck && !syntaxCheck.valid && <p className="text-xs">{syntaxCheck.reason}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
