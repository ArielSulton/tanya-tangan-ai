'use client'

import { SubjectSelector } from '@/components/layanan/SubjectSelector'
import { useSelectedInstitution, type Subject } from '@/hooks/useSelectedInstitution'
import { BookOpen, GraduationCap, HandMetal, MessageSquare } from 'lucide-react'

const studyTips = [
  'Apa itu pecahan dalam matematika?',
  'Bagaimana cara membaca peta?',
  'Apa fungsi klorofil pada tumbuhan?',
  'Ceritakan tentang pahlawan nasional Indonesia',
  'Bagaimana proses fotosintesis terjadi?',
]

export default function Layanan() {
  const { selectedSubject, selectSubject } = useSelectedInstitution()

  const handleSelectSubject = (subject: Subject) => {
    selectSubject(subject)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
              Pilih{' '}
              <span
                className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}
              >
                Mata Pelajaran
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
              Pilih jenjang dan mata pelajaran yang ingin kamu pelajari. PENSyarat AI siap membantu belajarmu
              menggunakan bahasa isyarat SIBI.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* Info + Tips in 2 columns */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              {/* Left — About the platform */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
                    <HandMetal className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="mb-1 text-xl font-bold text-gray-900">Bahasa Isyarat SIBI</h2>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Gunakan kamera untuk berkomunikasi lewat gerakan tangan (SIBI). AI kami menerjemahkan isyaratmu
                      menjadi teks secara real-time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <BookOpen className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="mb-1 text-xl font-bold text-gray-900">Materi Kurikulum SLB-B</h2>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Dokumen pelajaran sudah disesuaikan dengan kurikulum SLB-B untuk jenjang SDLB, SMPLB, dan SMALB.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100">
                    <GraduationCap className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="mb-1 text-xl font-bold text-gray-900">Tanya Apa Saja</h2>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Ajukan pertanyaan tentang materi pelajaran, minta penjelasan ulang, atau minta contoh soal.
                      Jawaban diberikan dalam bahasa Indonesia yang mudah dipahami.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right — Sample questions */}
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-gray-900">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Contoh Pertanyaan
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    Pertanyaan seperti ini bisa kamu tanyakan setelah memilih mata pelajaran.
                  </p>
                </div>
                {studyTips.map((question, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl p-4 ${
                      index === 0
                        ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white shadow-xl'
                        : 'border-2 border-gray-200/60 bg-white/80 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${index === 0 ? 'text-white' : 'text-gray-800'}`}>
                        {question}
                      </span>
                      {index === 0 && (
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                          Contoh
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject Selector (Full Width) */}
            <div className="rounded-2xl bg-white/60 p-6 shadow-sm backdrop-blur-sm">
              <SubjectSelector onSelectSubject={handleSelectSubject} selectedSubject={selectedSubject} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
