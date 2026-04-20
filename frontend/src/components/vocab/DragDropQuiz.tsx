'use client'

import { useState, useCallback, useEffect } from 'react'
import { DndContext, type DragEndEvent, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface QuizItem {
  id: string
  word: string
  subcategory: 'degree' | 'temporal' | 'modality' | 'intensity'
  emoji: string
  description: string
  distractors: string[]
}

interface DragDropQuizProps {
  category: string
  onComplete?: (score: number, total: number) => void
  onExit?: () => void
}

type QuizState = 'loading' | 'playing' | 'feedback' | 'results'

const MOCK_QUIZ_DATA: QuizItem[] = [
  {
    id: '1',
    word: 'sangat',
    subcategory: 'degree',
    emoji: '⚡',
    description: 'sangat = tingkat tertinggi',
    distractors: ['💧', '🍃', '🤔'],
  },
  {
    id: '2',
    word: 'sering',
    subcategory: 'temporal',
    emoji: '📅',
    description: 'sering = banyak kali',
    distractors: ['⏳', '🕰️', '🔔'],
  },
  {
    id: '3',
    word: 'pasti',
    subcategory: 'modality',
    emoji: '✅',
    description: 'pasti = 100% yakin',
    distractors: ['❓', '❌', '🤷'],
  },
  {
    id: '4',
    word: 'pedas',
    subcategory: 'intensity',
    emoji: '🌶️',
    description: 'pedas = rasa yang terasa di lidah',
    distractors: ['🧊', '🍋', '🍬'],
  },
  {
    id: '5',
    word: 'jarang',
    subcategory: 'temporal',
    emoji: '⏳',
    description: 'jarang = hampir tidak pernah',
    distractors: ['📅', '⏰', '🏃'],
  },
]

const CATEGORY_COLORS = {
  degree: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  temporal: 'bg-blue-100 text-blue-800 border-blue-200',
  modality: 'bg-amber-100 text-amber-800 border-amber-200',
  intensity: 'bg-red-100 text-red-800 border-red-200',
} as const

const CATEGORY_LABELS = {
  degree: 'Degree',
  temporal: 'Temporal',
  modality: 'Modality',
  intensity: 'Intensity',
} as const

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getEmojiRating(score: number, total: number): { stars: number; message: string; emoji: string } {
  const percentage = (score / total) * 100
  if (percentage === 100) return { stars: 3, message: 'Sempurna! 🎉', emoji: '🌟' }
  if (percentage >= 80) return { stars: 3, message: 'Bagus sekali!', emoji: '😊' }
  if (percentage >= 60) return { stars: 2, message: 'Bagus!', emoji: '🙂' }
  if (percentage >= 40) return { stars: 1, message: 'Coba lagi ya!', emoji: '💪' }
  return { stars: 1, message: 'Tetap semangat!', emoji: '✨' }
}

function DraggableItem({
  id,
  emoji,
  isCorrect,
  showResult,
}: {
  id: string
  emoji: string
  isCorrect?: boolean
  showResult?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const baseClasses = `
    flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 border-dashed
    bg-white/60 backdrop-blur-sm cursor-grab active:cursor-grabbing
    transition-all duration-200 select-none touch-none
    hover:bg-white/80 hover:border-solid hover:shadow-md
  `

  const resultClasses = showResult
    ? isCorrect
      ? 'border-emerald-400 bg-emerald-50 scale-110'
      : 'border-red-400 bg-red-50 scale-95'
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
      <span className="text-4xl">{emoji}</span>
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
    min-h-[100px] rounded-xl border-2 border-dashed
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

export function DragDropQuiz({ category, onComplete, onExit }: DragDropQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>('loading')
  const [questions, setQuestions] = useState<QuizItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const shuffled = shuffleArray(MOCK_QUIZ_DATA)
      setQuestions(shuffled.slice(0, 5))
      setQuizState('playing')
    }, 800)

    return () => clearTimeout(timer)
  }, [category])

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const current = questions[currentIndex]
      const options = shuffleArray([current.emoji, ...current.distractors.map((d) => d)])
      setShuffledOptions(options)
    }
  }, [currentIndex, questions])

  const currentQuestion = questions[currentIndex]

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (quizState !== 'playing' || !currentQuestion) return

      const { active } = event
      const droppedText = active.id as string

      setSelectedAnswer(droppedText)
      setQuizState('feedback')

      const correct = droppedText === currentQuestion.emoji
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
      setSelectedAnswer(null)
      setIsCorrect(null)
      setQuizState('playing')
    }
  }, [currentIndex, questions.length, score, onComplete])

  const handlePlayAgain = useCallback(() => {
    setQuestions(shuffleArray(MOCK_QUIZ_DATA).slice(0, 5))
    setCurrentIndex(0)
    setScore(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setQuizState('playing')
  }, [])

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
          <ResultScreen
            score={score}
            total={questions.length}
            onPlayAgain={handlePlayAgain}
            onExit={onExit ?? (() => {})}
          />
        </CardContent>
      </Card>
    )
  }

  if (!currentQuestion) return null

  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Card className="mx-auto w-full max-w-lg border-white bg-white/80 shadow-sm backdrop-blur-sm">
        <CardContent className="relative p-6">
          <ConfettiEffect show={showConfetti} />

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={CATEGORY_COLORS[currentQuestion.subcategory]}>
                {CATEGORY_LABELS[currentQuestion.subcategory]}
              </Badge>
              <span className="text-sm text-slate-500">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
            {onExit && (
              <Button variant="ghost" size="icon" onClick={onExit} className="text-slate-400 hover:text-slate-600">
                ✕
              </Button>
            )}
          </div>

          <Progress value={progress} className="mb-6 h-2 bg-slate-200" />

          <div className="mb-6 text-center">
            <p className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">Tarik emoji yang matching</p>
            <h3 className="text-3xl font-bold text-slate-800">{currentQuestion.word}</h3>
            <p className="mt-1 text-sm text-slate-600">{currentQuestion.description}</p>
          </div>

          <div className="mb-6">
            <p className="mb-2 text-center text-sm font-medium text-slate-500">Letakkan di sini:</p>
            <DropZone id="drop-zone" showResult={quizState === 'feedback'} isCorrect={isCorrect ?? undefined}>
              {selectedAnswer ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-4xl">{selectedAnswer}</span>
                  {quizState === 'feedback' && (
                    <span className={`text-lg font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? '✓ Benar!' : '✗ Salah'}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">?</span>
              )}
            </DropZone>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-center text-sm font-medium text-slate-500">Pilih jawaban:</p>
            <div className="grid grid-cols-4 gap-3">
              {shuffledOptions.map((option, index) => (
                <DraggableItem
                  key={`${option}-${index}`}
                  id={option}
                  emoji={option}
                  isCorrect={option === currentQuestion.emoji}
                  showResult={quizState === 'feedback'}
                />
              ))}
            </div>
          </div>

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

export default DragDropQuiz
