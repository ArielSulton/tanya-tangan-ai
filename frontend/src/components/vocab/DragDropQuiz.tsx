'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SizeContrastCard } from './SizeContrastCard'
import { IntensityCard } from './IntensityCard'
import { SelectionCard } from './SelectionCard'
import { CombinationCard } from './CombinationCard'

type VisualType = 'size-contrast' | 'intensity' | 'selection' | 'combination'

interface QuizItem {
  id: string
  word: string
  visualType: VisualType
  choices: string[]
}

interface DragDropQuizProps {
  category: string
  onComplete?: (score: number, total: number) => void
  onExit?: () => void
}

type QuizState = 'loading' | 'playing' | 'feedback' | 'results'

const KATA_KETERANGAN_QUIZ: QuizItem[] = [
  {
    id: '1',
    word: 'sangat',
    visualType: 'intensity',
    choices: ['sangat', 'besar', 'yang', 'dan'],
  },
  {
    id: '2',
    word: 'besar',
    visualType: 'size-contrast',
    choices: ['sangat', 'besar', 'kecil', 'dan'],
  },
  {
    id: '3',
    word: 'kecil',
    visualType: 'size-contrast',
    choices: ['sangat', 'besar', 'kecil', 'yang'],
  },
  {
    id: '4',
    word: 'yang',
    visualType: 'selection',
    choices: ['yang', 'dan', 'kecil', 'sangat'],
  },
  {
    id: '5',
    word: 'dan',
    visualType: 'combination',
    choices: ['dan', 'yang', 'besar', 'sangat'],
  },
]

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

function VisualCard({ word, visualType }: { word: string; visualType: VisualType }) {
  if (visualType === 'size-contrast') {
    return <SizeContrastCard word={word} category="kata_keterangan" mode="quiz" />
  }
  if (visualType === 'intensity') {
    return <IntensityCard word={word} category="kata_keterangan" mode="quiz" />
  }
  if (visualType === 'selection') {
    return <SelectionCard word={word} category="kata_keterangan" mode="quiz" />
  }
  if (visualType === 'combination') {
    return <CombinationCard word={word} category="kata_keterangan" mode="quiz" />
  }
  return null
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
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const shuffled = shuffleArray(KATA_KETERANGAN_QUIZ)
      setQuestions(shuffled.slice(0, 5))
      setQuizState('playing')
    }, 800)

    return () => clearTimeout(timer)
  }, [category])

  const currentQuestion = questions[currentIndex]

  const handleAnswer = useCallback(
    (word: string) => {
      if (quizState !== 'playing' || !currentQuestion) return

      setSelectedAnswer(word)
      setQuizState('feedback')

      const correct = word === currentQuestion.word
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
      onComplete?.(score + (isCorrect ? 0 : 0), questions.length)
    } else {
      setCurrentIndex((prev) => prev + 1)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setQuizState('playing')
    }
  }, [currentIndex, questions.length, score, isCorrect, onComplete])

  const handlePlayAgain = useCallback(() => {
    setQuestions(shuffleArray(KATA_KETERANGAN_QUIZ).slice(0, 5))
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
  const shuffledChoices = shuffleArray(currentQuestion.choices)

  return (
    <Card className="mx-auto w-full max-w-lg border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="relative p-6">
        <ConfettiEffect show={showConfetti} />

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-800">
              Keterangan Abstrak
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

        <Progress value={progress} className="mb-4 h-2 bg-slate-200" />

        <div className="mb-4 text-center">
          <p className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">Apa kata ini?</p>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-sm">
            <VisualCard word={currentQuestion.word} visualType={currentQuestion.visualType} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {shuffledChoices.map((choice) => {
            const isSelected = selectedAnswer === choice
            const isCorrectAnswer = choice === currentQuestion.word
            const showResult = quizState === 'feedback'

            let btnClass = 'h-12 rounded-xl font-bold text-lg shadow-sm transition-all '
            if (showResult) {
              if (isCorrectAnswer) {
                btnClass += 'bg-emerald-500 text-white shadow-emerald-200'
              } else if (isSelected && !isCorrectAnswer) {
                btnClass += 'bg-red-500 text-white shadow-red-200'
              } else {
                btnClass += 'bg-slate-100 text-slate-400'
              }
            } else {
              btnClass += 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:scale-[1.02]'
            }

            return (
              <Button
                key={choice}
                onClick={() => handleAnswer(choice)}
                disabled={quizState === 'feedback'}
                className={btnClass}
              >
                {choice}
              </Button>
            )
          })}
        </div>

        {quizState === 'feedback' && (
          <div className="flex flex-col items-center gap-3">
            <span className={`text-lg font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCorrect ? '✓ Benar!' : `✗ Salah! Jawabannya: ${currentQuestion.word}`}
            </span>
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
  )
}

export default DragDropQuiz
