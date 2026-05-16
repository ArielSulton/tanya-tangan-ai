import { notFound } from 'next/navigation'
import { GestureRecorder } from '@/components/dev/GestureRecorder'

export default function GestureRecorderPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <h1 className="text-lg font-semibold text-slate-800">Gesture Recorder (dev tool)</h1>
          <p className="text-xs text-slate-500">
            Records static (alphabet) and dynamic (word) hand-landmark samples for training the
            Phase 2D classifier. Samples persist in IndexedDB. Export CSV when ready.
          </p>
        </div>
      </header>
      <GestureRecorder />
    </main>
  )
}
