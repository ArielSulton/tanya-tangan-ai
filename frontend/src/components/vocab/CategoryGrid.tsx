'use client'

import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  {
    slug: 'kata_keterangan',
    label: 'Kata Keterangan Abstrak',
    count: '16 Kata',
    description:
      'Pelajari kata keterangan abstrak untuk memberikan detail dan makna pada kalimat. Kategori ini berisi kata penjelasan cara, tingkat, waktu, dan jumlah.',
    tags: ['Utama'],
    image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=600&h=800',
    overlayColor: 'from-emerald-950 via-emerald-900/90 to-transparent',
    btnColor: 'text-emerald-950 hover:bg-emerald-50',
    isFeatured: true,
  },
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

export function CategoryGrid() {
  const featuredCategory = CATEGORIES.find((c) => c.isFeatured)
  const otherCategories = CATEGORIES.filter((c) => !c.isFeatured)

  return (
    <div className="flex flex-col gap-8">
      {featuredCategory && (
        <Link
          key={featuredCategory.slug}
          href={`/vocab/${featuredCategory.slug}`}
          className="group hover:shadow-3xl relative w-full overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl transition-all duration-500 hover:-translate-y-1 border-4 border-emerald-500/70 hover:border-emerald-400"
        >
          <div className="absolute inset-0 h-[55%]">
            <Image
              src={featuredCategory.image}
              alt={featuredCategory.label}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          <div className="relative flex flex-col justify-end px-8 pt-40 pb-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold tracking-widest text-white uppercase shadow-lg shadow-emerald-500/50">
                Fitur Utama
              </span>
              {featuredCategory.tags
                .filter((t) => t !== 'Utama')
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            <div className="mb-2 flex items-end justify-between">
              <div>
                <h2 className="mb-1 text-4xl font-black tracking-tight text-white drop-shadow-lg sm:text-5xl">
                  {featuredCategory.label}
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-white/70">{featuredCategory.description}</p>
              </div>
              <span className="hidden rounded-full bg-emerald-500/90 px-5 py-2 text-sm font-bold text-white backdrop-blur-md sm:block">
                {featuredCategory.count}
              </span>
            </div>

            <button className="mt-5 w-full rounded-full bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/40 transition-all hover:bg-emerald-400 sm:w-auto sm:px-10">
              Mulai Belajar →
            </button>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {otherCategories.map((cat) => {
          const isComingSoon = cat.slug === 'coming-soon'

          if (isComingSoon) {
            return (
              <div
                key={cat.slug}
                className="group relative h-[480px] w-full max-w-[340px] cursor-not-allowed overflow-hidden rounded-[2.5rem] bg-slate-900 opacity-90 shadow-xl grayscale-[20%]"
              >
                <div className="absolute inset-0 h-[60%]">
                  <Image src={cat.image} alt={cat.label} fill className="object-cover" />
                </div>
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.overlayColor} opacity-100`} />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
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
                    disabled
                    className="w-full cursor-not-allowed rounded-full bg-white py-3.5 text-sm font-bold text-slate-950 opacity-80"
                  >
                    Segera Hadir
                  </button>
                </div>
              </div>
            )
          }

          return (
            <Link
              key={cat.slug}
              href={`/vocab/${cat.slug}`}
              className="group relative h-[480px] w-full max-w-[340px] overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="absolute inset-0 h-[60%]">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.overlayColor} opacity-100`} />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
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
                  className={`w-full rounded-full bg-white py-3.5 text-sm font-bold transition-colors ${cat.btnColor}`}
                >
                  Mulai Belajar
                </button>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
