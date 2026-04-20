'use client'

import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  {
    slug: 'hewan',
    label: 'Hewan',
    count: '32 Kata',
    description: 'Pelajari kosakata berbagai jenis hewan dan satwa dalam bahasa isyarat SIBI secara visual.',
    tags: ['Makhluk Hidup', 'Populer'],
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-emerald-950 via-emerald-900/90 to-transparent',
    btnColor: 'text-emerald-950 hover:bg-emerald-50',
  },
  {
    slug: 'benda',
    label: 'Benda',
    count: '45 Kata',
    description: 'Kenali benda-benda di sekitar kita mulai dari peralatan sekolah hingga perabotan rumah tangga.',
    tags: ['Sekitar Kita', 'Umum'],
    image: 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-blue-950 via-blue-900/90 to-transparent',
    btnColor: 'text-blue-950 hover:bg-blue-50',
  },
  {
    slug: 'alam',
    label: 'Alam',
    count: '28 Kata',
    description: 'Kosakata terkait fenomena alam, kondisi cuaca, dan lingkungan sekitar.',
    tags: ['Lingkungan', 'Eksplorasi'],
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-stone-900 via-stone-800/90 to-transparent',
    btnColor: 'text-stone-900 hover:bg-stone-50',
  },
  {
    slug: 'perasaan',
    label: 'Perasaan',
    count: '20 Kata',
    description: 'Pahami cara mengekspresikan emosi dan perasaan dengan bahasa isyarat.',
    tags: ['Emosi', 'Komunikasi'],
    image: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-purple-950 via-purple-900/90 to-transparent',
    btnColor: 'text-purple-950 hover:bg-purple-50',
  },
  {
    slug: 'kata_keterangan',
    label: 'Keterangan',
    count: '15 Kata',
    description: 'Pelajari perbandingan kata keterangan untuk memberikan detail kalimat.',
    tags: ['Tata Bahasa', 'Lanjut'],
    image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-rose-950 via-rose-900/90 to-transparent',
    btnColor: 'text-rose-950 hover:bg-rose-50',
  },
  {
    slug: 'coming-soon',
    label: 'Segera...',
    count: '0 Kata',
    description: 'Kategori kosakata baru sedang dalam tahap kurasi dan pengembangan.',
    tags: ['Segera Hadir', 'Update'],
    image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-slate-950 via-slate-900/90 to-transparent',
    btnColor: 'text-slate-950 hover:bg-slate-200',
  },
]

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const isComingSoon = cat.slug === 'coming-soon'
        const Wrapper = isComingSoon ? 'div' : Link
        const wrapperProps = isComingSoon
          ? {
              className:
                'group relative w-full max-w-[340px] overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-xl h-[480px] opacity-90 cursor-not-allowed grayscale-[20%]',
            }
          : {
              href: `/vocab/${cat.slug}`,
              className:
                'group relative w-full max-w-[340px] overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl h-[480px]',
            }

        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Wrapper key={cat.slug} {...(wrapperProps as any)}>
            {/* Background Image */}
            <div className="absolute inset-0 h-[60%]">
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                className={`object-cover transition-transform duration-700 ${isComingSoon ? '' : 'group-hover:scale-110'}`}
              />
            </div>

            {/* Gradient Overlay to blend image and solid bottom */}
            <div className={`absolute inset-0 bg-gradient-to-t ${cat.overlayColor} opacity-100`} />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-6">
              {/* Carousel dots mock */}
              <div className="mb-4 ml-1 flex gap-1.5 opacity-60">
                <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-white/40"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-white/40"></div>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white">{cat.label}</h2>
                <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                  {cat.count}
                </span>
              </div>

              <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-slate-300">{cat.description}</p>

              <div className="mb-6 flex flex-wrap gap-2">
                {cat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/5 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                disabled={isComingSoon}
                className={`w-full rounded-full bg-white py-3.5 text-sm font-bold transition-colors ${cat.btnColor} ${isComingSoon ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                {isComingSoon ? 'Segera Hadir' : 'Mulai Belajar'}
              </button>
            </div>
          </Wrapper>
        )
      })}
    </div>
  )
}
