import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const techStack = [
  { name: 'TensorFlow.js', logo: '/assets/tech/tensorflowjs.png' },
  { name: 'MediaPipe', logo: '/assets/tech/mediapipe.png' },
  { name: 'Next.js', logo: '/assets/tech/nextjs.png' },
  { name: 'LLaMA', logo: '/assets/tech/llama.png' },
  { name: 'FastAPI', logo: '/assets/tech/fastapi.png' },
  { name: 'Supabase', logo: '/assets/tech/supabase.png' },
  { name: 'Scikit-learn', logo: '/assets/tech/sklearn.png' },
  { name: 'Docker', logo: '/assets/tech/docker.png' },
]

const features = [
  {
    title: 'Penerjemah Bahasa Isyarat',
    description: 'Mengubah bahasa isyarat menjadi teks digital dengan Computer Vision.',
    icon: '/assets/tech/penerjemah.png',
    bgColor: 'bg-orange-50',
  },
  {
    title: 'Chatbot Materi Pelajaran SLB-B',
    description: 'Memberikan penjelasan materi otomatis melalui chatbot berbasis large language model.',
    icon: '/assets/tech/langchain_llama.png',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Speech-to-Text Sebagai Feedback Komunikasi',
    description: 'Mengubah suara menjadi teks untuk memudahkan komunikasi modal.',
    icon: '/assets/tech/notes.png',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Sistem Rekomendasi Chatbot',
    description: 'Evaluasi kinerja platform menggunakan similarity embedding.',
    icon: '/assets/tech/sistem_rekomendasi.png',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'Ringkasan Percakapan Otomatis',
    description: 'Membuat catatan percakapan otomatis dalam format PDF dan QR.',
    icon: '/assets/tech/ringkasan.png',
    bgColor: 'bg-pink-50',
  },
  {
    title: 'Dashboard Admin & Super Admin',
    description: 'Monitoring dan evaluasi kinerja chatbot serta pengguna secara real-time.',
    icon: '/assets/tech/dashboard_feature.png',
    bgColor: 'bg-indigo-50',
  },
]

export default function Beranda() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Hero Text */}
            <div className="max-w-3xl space-y-6">
              <h1 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
                Platform belajar inklusif untuk siswa{' '}
                <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                  SLB-B
                </span>{' '}
                tunarungu
              </h1>
              <p className="mx-auto max-w-xl text-lg text-gray-600">
                Mendukung proses belajar mengajar di Sekolah Luar Biasa tipe B melalui bahasa isyarat SIBI dan AI
                berbasis materi kurikulum.
              </p>
              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-3">
                <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-800 shadow-sm">
                  🤲 SIBI Support
                </div>
                <div className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 shadow-sm">
                  🎤 Speech-to-Text
                </div>
                <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 shadow-sm">
                  🤖 RAG Materi SLB-B
                </div>
                <div className="flex items-center space-x-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500"></div>
                  <span>System Online</span>
                </div>
              </div>
              <Link href="/layanan">
                <Button size="lg" className="rounded-full bg-green-600 px-8 py-3 text-lg text-white hover:bg-green-700">
                  Mulai Belajar →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Pilar{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                Teknologi
              </span>{' '}
              Sebagai Dapur Pacu
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-8">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className="flex flex-col items-center rounded-lg bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="relative mb-4 h-20 w-20">
                  <Image
                    src={tech.logo}
                    alt={tech.name}
                    fill
                    className="object-contain filter transition-all hover:brightness-110"
                  />
                </div>
                <p className="text-center text-sm font-medium text-gray-700">{tech.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-green-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Kenapa teknologi pendidikan inklusif{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                penting
              </span>{' '}
              untuk siswa tunarungu?
            </h2>
          </div>

          <div className="mx-auto max-w-6xl">
            {/* Mobile Layout */}
            <div className="grid grid-cols-1 gap-8 md:hidden">
              {/* Left Stats */}
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-gray-900">313 ribu</div>
                <p className="text-base text-gray-700">Total penyandang disabilitas pendengaran Indonesia 2023</p>
              </div>

              {/* Center Image */}
              <div className="relative text-center">
                <Image
                  src="/assets/tech/persentase.png"
                  alt="Statistics Infographic"
                  width={400}
                  height={300}
                  className="mx-auto h-auto w-full max-w-xs"
                />
                <p className="mt-4 text-xs text-gray-600">
                  Hasil survei &quot;aksebilitas penyandang disabilitas pendengaran&quot; di Indonesia
                </p>
              </div>

              {/* Right Stats */}
              <div className="text-center">
                <div className="mb-2 text-4xl font-bold text-gray-900">43.0%</div>
                <p className="text-base text-gray-700">
                  Fasilitas penyandang disabilitas pendengaran masih belum terlayani
                </p>
              </div>
            </div>

            {/* Tablet Layout */}
            <div className="hidden md:flex md:flex-col md:items-center md:gap-8 lg:hidden">
              {/* Stats Row */}
              <div className="flex flex-col items-center gap-8 md:flex-row md:gap-16">
                {/* Left Stats */}
                <div className="text-center">
                  <div className="mb-2 text-5xl font-bold text-gray-900">313 ribu</div>
                  <p className="text-lg text-gray-700">Total penyandang disabilitas pendengaran Indonesia 2023</p>
                </div>

                {/* Right Stats */}
                <div className="text-center">
                  <div className="mb-2 text-5xl font-bold text-gray-900">43.0%</div>
                  <p className="text-lg text-gray-700">
                    Fasilitas penyandang disabilitas pendengaran masih belum terlayani
                  </p>
                </div>
              </div>

              {/* Center Image */}
              <div className="relative text-center">
                <Image
                  src="/assets/tech/persentase.png"
                  alt="Statistics Infographic"
                  width={400}
                  height={300}
                  className="mx-auto h-auto w-full max-w-sm"
                />
                <p className="mt-4 text-sm text-gray-600">
                  Hasil survei &quot;aksebilitas penyandang disabilitas pendengaran&quot; di Indonesia
                </p>
              </div>
            </div>

            {/* Desktop Layout - Centered Flex */}
            <div className="hidden lg:flex lg:items-center lg:justify-center lg:gap-12">
              {/* Left Stats */}
              <div className="text-center">
                <div className="mb-2 text-6xl font-bold text-gray-900">313 ribu</div>
                <p className="text-lg text-gray-700">Total penyandang disabilitas pendengaran Indonesia 2023</p>
              </div>

              {/* Center Image */}
              <div className="relative flex-shrink-0 text-center">
                <Image
                  src="/assets/tech/persentase.png"
                  alt="Statistics Infographic"
                  width={400}
                  height={300}
                  className="mx-auto h-auto w-full max-w-sm"
                />
                <p className="mt-4 text-sm text-gray-600">
                  Hasil survei &quot;aksebilitas penyandang disabilitas pendengaran&quot; di Indonesia
                </p>
              </div>

              {/* Right Stats */}
              <div className="text-center">
                <div className="mb-2 text-6xl font-bold text-gray-900">43.0%</div>
                <p className="text-lg text-gray-700">
                  Fasilitas penyandang disabilitas pendengaran masih belum terlayani
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Bagaimana Tanya Tangan AI membantu penyandang{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                disabilitas berkomunikasi di layanan publik?
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className={`${feature.bgColor} border-0 transition-shadow hover:shadow-lg`}>
                <CardContent className="p-8 text-center">
                  <div className="relative mx-auto mb-6 h-64 w-64">
                    <Image src={feature.icon} alt={feature.title} fill className="object-contain" />
                  </div>
                  <h3 className="mb-4 text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="leading-relaxed text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-0 bg-gradient-to-r from-green-600 to-green-700 shadow-xl">
            <CardContent className="p-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">Siap untuk berkomunikasi tanpa batas?</h2>
              <p className="mb-8 text-lg text-green-100">
                Bergabunglah dengan ribuan pengguna yang telah merasakan kemudahan berkomunikasi dengan Tanya Tangan AI
              </p>
              <Link href="/layanan">
                <Button size="lg" variant="secondary" className="rounded-full px-8 py-3 text-lg">
                  Mulai Sekarang →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
