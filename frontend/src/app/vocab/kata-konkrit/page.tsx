'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CategoryCard, type CategoryCardData } from '@/components/vocab/CategoryGrid'

const SUBCATEGORIES: CategoryCardData[] = [
  {
    slug: 'hewan',
    label: 'Hewan',
    count: '32 Kata',
    description: 'Pelajari kosakata berbagai jenis hewan melalui isyarat SIBI secara visual.',
    tags: ['Makhluk Hidup', 'Populer'],
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-emerald-950 via-emerald-900/90 to-transparent',
    btnColor: 'text-emerald-950 hover:bg-emerald-50',
  },
  {
    slug: 'benda',
    label: 'Benda',
    count: '45 Kata',
    description: 'Kenali benda-benda di sekitar kita, mulai dari peralatan sekolah hingga perabotan rumah tangga.',
    tags: ['Sekitar Kita', 'Umum'],
    image: 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-blue-950 via-blue-900/90 to-transparent',
    btnColor: 'text-blue-950 hover:bg-blue-50',
  },
  {
    slug: 'alam',
    label: 'Alam',
    count: '28 Kata',
    description: 'Pelajari kosakata terkait fenomena alam, kondisi cuaca, dan lingkungan sekitar.',
    tags: ['Lingkungan', 'Eksplorasi'],
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-stone-900 via-stone-800/90 to-transparent',
    btnColor: 'text-stone-900 hover:bg-stone-50',
  },
]

export default function KataKonkritPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4">
          <Link
            href="/vocab"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-emerald-600 hover:shadow"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">Kata Konkrit</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Kata benda nyata yang mudah dikenali secara visual. Pilih salah satu kategori untuk mulai belajar isyarat
              hewan, benda, atau alam.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SUBCATEGORIES.map((cat) => (
            <CategoryCard key={cat.slug} cat={cat} />
          ))}
        </div>
      </div>
    </div>
  )
}
