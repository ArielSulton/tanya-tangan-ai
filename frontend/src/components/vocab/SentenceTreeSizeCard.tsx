'use client'

import { Card, CardContent } from '@/components/ui/card'

/**
 * Visual illustration for the example sentence "pohon yang besar".
 * Reuses the app's existing big/small size-contrast idiom (see
 * SizeContrastCard) but applied to a full sentence: a large, glowing,
 * bouncing tree next to a small, greyed-out sapling.
 */
export function SentenceTreeSizeCard() {
  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h3 className="text-2xl leading-snug font-black tracking-wide text-emerald-700">
          Pohon <span className="text-slate-400">yang</span> Besar
        </h3>

        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-emerald-50 to-teal-50 p-8">
          <div className="absolute top-1/2 left-1/3 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 opacity-40 mix-blend-multiply blur-2xl" />

          <div className="relative z-10 flex w-full items-end justify-center gap-6 px-4">
            <div className="relative z-20 flex scale-110 flex-col items-center">
              <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-200/50 blur-xl" />
              <span className="animate-bounce-slow text-[5rem] leading-none drop-shadow-xl sm:text-[6rem]">🌳</span>
              <div className="animate-shadow-bounce h-2 w-20 rounded-full bg-black/15 blur-[2px]" />
            </div>

            <div className="relative z-10 flex scale-90 flex-col items-center opacity-40 grayscale">
              <span className="text-[2rem] leading-none drop-shadow-xl sm:text-[2.5rem]">🌱</span>
              <div className="h-1.5 w-8 rounded-full bg-black/15 blur-[1px]" />
            </div>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-slate-600">
          Pohon besar itu jauh lebih tinggi dan lebar dibanding pohon kecil di sebelahnya.
        </p>
      </CardContent>
    </Card>
  )
}
