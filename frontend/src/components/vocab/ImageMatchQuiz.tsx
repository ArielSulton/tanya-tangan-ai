'use client'

import { useState, useCallback, useEffect } from 'react'
import { DndContext, type DragEndEvent, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Image from 'next/image'

interface QuizQuestion {
  id: string
  text: string
  imageUrl: string
  category: string
}

interface ImageMatchQuizProps {
  category: string
  onComplete?: (score: number, total: number) => void
  onExit?: () => void
}

type QuizState = 'loading' | 'playing' | 'feedback' | 'results'

const CATEGORY_EMOJI: Record<string, string> = {
  hewan: '🐾',
  benda: '📦',
  alam: '🌿',
  perasaan: '😊',
}

const CATEGORY_LABEL: Record<string, string> = {
  hewan: 'Hewan',
  benda: 'Benda',
  alam: 'Alam',
  perasaan: 'Perasaan',
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getEmojiRating(score: number, total: number) {
  const percentage = (score / total) * 100
  if (percentage === 100) return { stars: 3, message: 'Sempurna! 🎉', emoji: '🌟' }
  if (percentage >= 80) return { stars: 3, message: 'Bagus sekali!', emoji: '😊' }
  if (percentage >= 60) return { stars: 2, message: 'Bagus!', emoji: '🙂' }
  if (percentage >= 40) return { stars: 1, message: 'Coba lagi ya!', emoji: '💪' }
  return { stars: 1, message: 'Tetap semangat!', emoji: '✨' }
}

function ImageWithFallback({
  src,
  alt,
  fallbackEmoji,
  width,
  height,
  className,
}: {
  src: string
  alt: string
  fallbackEmoji: React.ReactNode
  width: number
  height: number
  className?: string
}) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <span className={`flex items-center justify-center ${className ?? ''}`} style={{ width, height }}>
        {fallbackEmoji}
      </span>
    )
  }

  return (
    <Image src={src} alt={alt} width={width} height={height} className={className} onError={() => setImgError(true)} />
  )
}

function DraggableImage({
  id,
  imageUrl,
  text,
  isCorrect,
  showResult,
}: {
  id: string
  imageUrl: string
  text: string
  isCorrect?: boolean
  showResult?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  const baseClasses = `
    relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-dashed
    bg-white/60 backdrop-blur-sm cursor-grab active:cursor-grabbing
    transition-all duration-200 select-none touch-none
    hover:bg-white/80 hover:border-solid hover:shadow-md
  `

  const resultClasses = showResult
    ? isCorrect
      ? 'border-emerald-400 bg-emerald-50 scale-110 shadow-lg'
      : 'border-red-400 bg-red-50 scale-95 opacity-60'
    : ''

  const draggingClasses = isDragging ? 'opacity-50 scale-105 z-50 shadow-xl' : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${baseClasses} ${resultClasses} ${draggingClasses}`}
    >
      <ImageWithFallback
        src={imageUrl}
        alt={text}
        fallbackEmoji={<span className="text-4xl">{CATEGORY_EMOJI[text] ?? '❓'}</span>}
        width={80}
        height={80}
        className="h-20 w-20 rounded-lg object-cover"
      />
    </div>
  )
}

function DropZone({
  id,
  children,
  showResult,
  isCorrect,
}: {
  id: string
  children?: React.ReactNode
  showResult?: boolean
  isCorrect?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const baseClasses = `
    relative flex flex-col items-center justify-center gap-2
    min-h-[140px] rounded-xl border-2 border-dashed
    transition-all duration-300
  `

  const defaultBg = 'bg-slate-50/50 border-slate-300'
  const hoverBg = 'bg-blue-50/50 border-blue-400 border-solid scale-[1.02]'
  const correctBg = 'bg-emerald-50 border-emerald-400 border-solid'
  const wrongBg = 'bg-red-50 border-red-400 border-solid'

  let stateBg = defaultBg
  if (showResult) {
    stateBg = isCorrect ? correctBg : wrongBg
  } else if (isOver) {
    stateBg = hoverBg
  }

  return (
    <div ref={setNodeRef} className={`${baseClasses} ${stateBg}`}>
      {children}
    </div>
  )
}

function ConfettiEffect({ show }: { show: boolean }) {
  if (!show) return null

  const emojis = ['🎉', '✨', '🌟', '💫', '⭐', '🎊']

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {emojis.map((emoji, i) => (
        <div
          key={i}
          className="absolute animate-[fall_linear_forwards]"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            animationDuration: `${1 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        >
          <span className="text-2xl">{emoji}</span>
        </div>
      ))}
      <style>{`
        @keyframes fall_linear_forwards {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function ResultScreen({
  score,
  total,
  onPlayAgain,
  onExit,
}: {
  score: number
  total: number
  onPlayAgain: () => void
  onExit: () => void
}) {
  const { stars, message, emoji } = getEmojiRating(score, total)
  const percentage = Math.round((score / total) * 100)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-6 p-6 text-center duration-500">
      <div className="text-6xl">{emoji}</div>

      <div>
        <h2 className="text-3xl font-bold text-slate-800">{message}</h2>
        <p className="mt-2 text-lg text-slate-600">
          Skor: {score} / {total} ({percentage}%)
        </p>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className={`text-4xl ${i < stars ? '' : 'opacity-30'}`}>
            ⭐
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <Button onClick={onPlayAgain} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
          Main Lagi
        </Button>
        <Button onClick={onExit} variant="outline" size="lg">
          Keluar
        </Button>
      </div>
    </div>
  )
}

export function ImageMatchQuiz({ category, onComplete, onExit }: ImageMatchQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>('loading')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [shuffledOptions, setShuffledOptions] = useState<QuizQuestion[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch words for this category from the API
  useEffect(() => {
    async function fetchQuestions() {
      try {
        setQuizState('loading')
        setError(null)

        // Fetch all words with images for this category
        const res = await fetch(`/api/v1/vocab/words?category=${encodeURIComponent(category)}&has_image=true&limit=20`)
        if (!res.ok) throw new Error('Gagal memuat kata')

        const data = await res.json()
        const words: QuizQuestion[] = (data.words ?? data ?? [])
          .filter((w: Record<string, unknown>) => w.image_url && w.word_type === 'konkret')
          .map((w: Record<string, unknown>) => ({
            id: w.id as string,
            text: w.text as string,
            imageUrl: w.image_url as string,
            category: w.category as string,
          }))

        if (words.length < 2) {
          setError('Belum cukup kata dengan gambar untuk kuis ini.')
          return
        }

        const shuffled = shuffleArray(words)
        setQuestions(shuffled.slice(0, Math.min(5, shuffled.length)))
        setQuizState('playing')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        setQuizState('loading')
      }
    }

    void fetchQuestions()
  }, [category])

  // Shuffle options when current question changes
  useEffect(() => {
    if (questions.length === 0 || currentIndex >= questions.length) return

    const current = questions[currentIndex]
    // Pick 3 random distractors from other questions
    const others = questions.filter((q) => q.id !== current.id)
    const distractors = shuffleArray(others).slice(0, 3)
    // Shuffle correct + distractors
    setShuffledOptions(shuffleArray([current, ...distractors]))
  }, [currentIndex, questions])

  const currentQuestion = questions[currentIndex]

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (quizState !== 'playing' || !currentQuestion) return

      const { active } = event
      const droppedId = active.id as string

      setSelectedId(droppedId)
      setQuizState('feedback')

      const correct = droppedId === currentQuestion.id
      setIsCorrect(correct)

      if (correct) {
        setScore((prev) => prev + 1)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      }
    },
    [quizState, currentQuestion],
  )

  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setQuizState('results')
      onComplete?.(score, questions.length)
    } else {
      setCurrentIndex((prev) => prev + 1)
      setSelectedId(null)
      setIsCorrect(null)
      setQuizState('playing')
    }
  }, [currentIndex, questions.length, score, onComplete])

  const handlePlayAgain = useCallback(() => {
    const shuffled = shuffleArray(questions)
    setQuestions(shuffled)
    setCurrentIndex(0)
    setScore(0)
    setSelectedId(null)
    setIsCorrect(null)
    setQuizState('playing')
  }, [questions])

  const handleExit = useCallback(() => {
    onExit?.()
  }, [onExit])

  if (error) {
    return (
      <Card className="mx-auto w-full max-w-lg border-white bg-white/80 shadow-sm backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="text-5xl">😔</div>
          <p className="text-lg font-medium text-slate-600">{error}</p>
          <Button onClick={handleExit} variant="outline" size="lg">
            Kembali
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (quizState === 'loading') {
    return (
      <Card className="mx-auto w-full max-w-lg border-white bg-white/80 shadow-sm backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="animate-pulse text-5xl">🎮</div>
          <p className="text-lg font-medium text-slate-600">Memuat kuis...</p>
        </CardContent>
      </Card>
    )
  }

  if (quizState === 'results') {
    return (
      <Card className="mx-auto w-full max-w-lg border-white bg-white/80 shadow-sm backdrop-blur-sm">
        <CardContent className="p-6">
          <ResultScreen score={score} total={questions.length} onPlayAgain={handlePlayAgain} onExit={handleExit} />
        </CardContent>
      </Card>
    )
  }

  if (!currentQuestion) return null

  const selectedQuestion = selectedId ? questions.find((q) => q.id === selectedId) : null
  const progress = ((currentIndex + 1) / questions.length) * 100
  const categoryLabel = CATEGORY_LABEL[category] ?? category

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Card className="mx-auto w-full max-w-lg border-white bg-white/80 shadow-sm backdrop-blur-sm">
        <CardContent className="relative p-6">
          <ConfettiEffect show={showConfetti} />

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                {CATEGORY_EMOJI[category] ?? '📖'} {categoryLabel}
              </span>
              <span className="text-sm text-slate-500">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
            {onExit && (
              <Button variant="ghost" size="icon" onClick={handleExit} className="text-slate-400 hover:text-slate-600">
                ✕
              </Button>
            )}
          </div>

          <Progress value={progress} className="mb-6 h-2 bg-slate-200" />

          {/* Prompt: word text */}
          <div className="mb-6 text-center">
            <p className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">
              Cocokkan gambar dengan kata di bawah
            </p>
            <h3 className="text-4xl font-black text-slate-800">{currentQuestion.text}</h3>
          </div>

          {/* Drop zone */}
          <div className="mb-6">
            <p className="mb-2 text-center text-sm font-medium text-slate-500">Letakkan gambar yang benar di sini:</p>
            <DropZone id="drop-zone" showResult={quizState === 'feedback'} isCorrect={isCorrect ?? undefined}>
              {selectedQuestion ? (
                <div className="flex flex-col items-center gap-2">
                  <ImageWithFallback
                    src={selectedQuestion.imageUrl}
                    alt={selectedQuestion.text}
                    fallbackEmoji={<span className="text-5xl">{CATEGORY_EMOJI[category] ?? '❓'}</span>}
                    width={100}
                    height={100}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  {quizState === 'feedback' && (
                    <span className={`text-lg font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? '✓ Benar!' : '✗ Salah'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <span className="text-5xl">？</span>
                  <span className="text-sm">Seret gambar ke sini</span>
                </div>
              )}
            </DropZone>
          </div>

          {/* Draggable image options */}
          <div className="mb-6">
            <p className="mb-3 text-center text-sm font-medium text-slate-500">Pilih gambar:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shuffledOptions.map((option) => (
                <DraggableImage
                  key={option.id}
                  id={option.id}
                  imageUrl={option.imageUrl}
                  text={option.text}
                  isCorrect={option.id === currentQuestion.id}
                  showResult={quizState === 'feedback'}
                />
              ))}
            </div>
          </div>

          {/* Next button */}
          {quizState === 'feedback' && (
            <div className="flex justify-center">
              <Button
                onClick={handleNext}
                size="lg"
                className={`px-8 ${isCorrect ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'}`}
              >
                {currentIndex >= questions.length - 1 ? 'Lihat Hasil' : 'Soal Berikutnya'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </DndContext>
  )
}

export default ImageMatchQuiz
