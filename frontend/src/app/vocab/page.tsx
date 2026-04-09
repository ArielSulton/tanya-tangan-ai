import { CategoryGrid } from '@/components/vocab/CategoryGrid'
import { Hand } from 'lucide-react'

export default function VocabPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Hand className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Belajar Kosakata</h1>
            <p className="mx-auto max-w-xl text-lg text-gray-600">
              Pilih kategori kata, lalu gesturkan kata menggunakan bahasa isyarat SIBI.
            </p>
          </div>
          <CategoryGrid />
        </div>
      </section>
    </div>
  )
}
