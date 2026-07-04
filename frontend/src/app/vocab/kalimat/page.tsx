'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Keyboard, Loader2, RotateCcw } from 'lucide-react'
import { GestureRecognition } from '@/components/gesture/gesture-recognition'
import { WordChip } from '@/components/vocab/WordChip'
import { AIFallbackCard } from '@/components/vocab/AIFallbackCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addToken,
  classifyFallbackAnyResponse,
  isDynamicGestureWord,
  removeTokenAt,
  resetTokens,
  type SentenceToken,
} from '@/lib/vocab/sentence-composer'

type PendingState =
  | { state: 'idle' }
  | { state: 'checking'; rawWord: string }
  | { state: 'suggestion'; rawWord: string; suggestedWord: string; explanation: string | null }
  | { state: 'not_found'; rawWord: string; explanation: string | null }

export default function VocabKalimatPage() {
  const [tokens, setTokens] = useState<SentenceToken[]>([])
  const [pending, setPending] = useState<PendingState>({ state: 'idle' })
  const [manualWord, setManualWord] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const checkWord = useCallback(async (rawWord: string) => {
    setPending({ state: 'checking', rawWord })

    try {
      const res = await fetch('/api/v1/vocab/fallback-any', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gesture_input: rawWord }),
      })
      if (!res.ok) throw new Error('fallback-any failed')

      const data = await res.json()
      const outcome = classifyFallbackAnyResponse(data)

      if (outcome.kind === 'found') {
        setTokens((prev) => addToken(prev, { word: outcome.word, category: outcome.category }))
        setPending({ state: 'idle' })
        return
      }
      if (outcome.kind === 'suggestion') {
        setPending({
          state: 'suggestion',
          rawWord,
          suggestedWord: outcome.suggestedWord,
          explanation: outcome.explanation,
        })
        return
      }
      setPending({ state: 'not_found', rawWord, explanation: outcome.explanation })
    } catch {
      setPending({ state: 'not_found', rawWord, explanation: 'Gagal memeriksa kata, coba lagi.' })
    }
  }, [])

  // Single entry point for both camera recognition and manual typing: short-circuits
  // the 5 hardcoded dynamic gesture words straight to a chip (they may not have a DB
  // entry in any category), otherwise validates through /vocab/fallback-any.
  const addWord = useCallback(
    (rawWord: string) => {
      const normalized = rawWord.toLowerCase().trim().replace(/_/g, ' ')
      if (!normalized) return

      if (isDynamicGestureWord(normalized)) {
        setTokens((prev) => addToken(prev, { word: normalized, category: null }))
        setPending({ state: 'idle' })
        return
      }

      void checkWord(normalized)
    },
    [checkWord],
  )

  const handleWordFormed = useCallback(
    (word: string) => {
      addWord(word)
    },
    [addWord],
  )

  const handleAcceptSuggestion = useCallback(
    (suggestedWord: string) => {
      addWord(suggestedWord)
    },
    [addWord],
  )

  const handleManualSubmit = () => {
    if (manualWord.trim()) {
      addWord(manualWord.trim())
      setManualWord('')
    }
  }

  const handleRemoveToken = (index: number) => {
    setTokens((prev) => removeTokenAt(prev, index))
  }

  const handleReset = () => {
    setTokens(resetTokens())
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 selection:bg-emerald-200">
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-200/40 mix-blend-multiply blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-blue-200/40 mix-blend-multiply blur-[100px]" />

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
            <h1 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Latihan Kalimat</h1>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-8">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="min-h-[460px] flex-grow overflow-hidden rounded-[2.5rem] bg-slate-50 p-2 shadow-inner ring-1 ring-black/5">
                <GestureRecognition
                  onWordFormed={handleWordFormed}
                  enableWordFormation={true}
                  showAlternatives={false}
                />
              </div>

              {pending.state === 'checking' && (
                <div className="flex items-center gap-3 rounded-3xl bg-amber-50 p-4 text-amber-600 shadow-sm ring-2 ring-amber-200">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Memeriksa kata &ldquo;{pending.rawWord}&rdquo;…</span>
                </div>
              )}

              {pending.state === 'suggestion' && (
                <AIFallbackCard
                  suggestedWord={pending.suggestedWord}
                  explanation={pending.explanation ?? ''}
                  onTrySuggested={handleAcceptSuggestion}
                />
              )}

              {pending.state === 'not_found' && (
                <AIFallbackCard
                  suggestedWord={null}
                  explanation={pending.explanation ?? 'Kata belum dikenali, coba lagi.'}
                />
              )}

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
                    className="h-12 border-0 bg-transparent text-lg font-medium text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    onClick={handleManualSubmit}
                    disabled={!manualWord.trim() || pending.state === 'checking'}
                    className="h-12 rounded-full bg-emerald-500 px-6 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative flex h-full min-h-[400px] flex-col gap-4 overflow-hidden rounded-3xl border border-slate-100 bg-white/50 p-6 shadow-sm lg:col-span-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Kalimatmu</h2>
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
                    Peragakan isyarat kata demi kata, atau ketik manual, untuk menyusun kalimatmu di sini.
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
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
