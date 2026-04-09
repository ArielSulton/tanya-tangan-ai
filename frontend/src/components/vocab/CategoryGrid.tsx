'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

const CATEGORIES = [
  { slug: 'hewan', label: 'Hewan', emoji: '🐾', color: 'from-green-400 to-emerald-500' },
  { slug: 'benda', label: 'Benda', emoji: '📦', color: 'from-blue-400 to-cyan-500' },
  { slug: 'alam', label: 'Alam', emoji: '🌿', color: 'from-teal-400 to-green-500' },
  { slug: 'perasaan', label: 'Perasaan', emoji: '😊', color: 'from-yellow-400 to-orange-500' },
  { slug: 'kata_keterangan', label: 'Kata Keterangan', emoji: '⚡', color: 'from-purple-400 to-pink-500' },
] as const

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((cat) => (
        <Link key={cat.slug} href={`/vocab/${cat.slug}`}>
          <Card className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${cat.color} text-3xl shadow-md`}
              >
                {cat.emoji}
              </div>
              <span className="text-center text-base font-semibold text-gray-800">{cat.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
