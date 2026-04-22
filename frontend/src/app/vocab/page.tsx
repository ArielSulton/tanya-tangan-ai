import { CategoryGrid } from '@/components/vocab/CategoryGrid'

export default function VocabPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 selection:bg-emerald-200">
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-200/40 mix-blend-multiply blur-[100px]"></div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-blue-200/40 mix-blend-multiply blur-[100px]"></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-100/40 mix-blend-multiply blur-[80px]"></div>

      <section className="relative z-10 py-10 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <CategoryGrid />
        </div>
      </section>
    </div>
  )
}
