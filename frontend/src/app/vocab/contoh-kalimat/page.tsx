'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SentenceTreeSizeCard } from '@/components/vocab/SentenceTreeSizeCard'
import { SentenceCombinationCard } from '@/components/vocab/SentenceCombinationCard'

const EXAMPLE_SENTENCES = [
  { id: 'pohon-yang-besar', text: 'Pohon yang besar', Illustration: SentenceTreeSizeCard },
  { id: 'kucing-dan-gajah', text: 'Kucing dan gajah', Illustration: SentenceCombinationCard },
]

export default function VocabContohKalimatPage() {
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
          <p className="mb-8 max-w-2xl text-slate-600">
            Lihat contoh kalimat lengkap dengan visualisasinya, dirangkai dari kata-kata yang sudah kamu pelajari.
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {EXAMPLE_SENTENCES.map(({ id, text, Illustration }) => (
              <div key={id} className="flex flex-col items-center gap-4">
                <Illustration />
                <p className="text-center text-lg font-bold text-slate-800">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
