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
    title: 'Pengenalan Gestur SIBI Real-time',
    description:
      'Siswa memasukkan kata melalui gestur bahasa isyarat SIBI via kamera browser—tanpa instalasi. MediaPipe Hands mengenali 21 landmark tangan secara langsung.',
    icon: '/assets/tech/penerjemah.png',
    bgColor: 'bg-orange-50',
  },
  {
    title: 'Visualisasi Kata Konkret',
    description:
      'Untuk kata benda seperti "kucing", "apel", atau "pohon", platform menampilkan foto objek nyata beserta label kata agar makna tersampaikan secara visual.',
    icon: '/assets/tech/notes.png',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Komparasi Visual Kata Abstrak',
    description:
      'Untuk kata keterangan seperti "sedikit", "agak", "sangat", dan "terlalu", platform menampilkan gambar berdampingan yang merepresentasikan derajat makna secara konkret.',
    icon: '/assets/tech/sistem_rekomendasi.png',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'AI Fallback (LLaMA 3.3)',
    description:
      'Jika kata belum tersedia di basis data, sistem menggunakan LLaMA 3.3 via ChatGroq untuk memberikan saran kata terdekat dan penjelasan singkat kontekstual.',
    icon: '/assets/tech/langchain_llama.png',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'Kategori Kosakata Terstruktur',
    description:
      'Kosakata dikelompokkan dalam lima kategori: Hewan, Benda, Alam, Perasaan, dan Kata Keterangan—sesuai materi Bahasa Indonesia Kurikulum Merdeka SDLB-B.',
    icon: '/assets/tech/ringkasan.png',
    bgColor: 'bg-pink-50',
  },
  {
    title: 'Dashboard Admin Guru',
    description:
      'Guru dapat menambah, memperbarui, dan mengelola kosakata beserta gambar secara mandiri. Sistem juga mencatat kata yang sering dicari untuk prioritas pengembangan konten.',
    icon: '/assets/tech/dashboard_feature.png',
    bgColor: 'bg-indigo-50',
  },
]

const differentiators = [
  { label: 'Input Gestur SIBI Real-time', have: true },
  { label: 'Visual Konkret: Gambar Objek', have: true },
  { label: 'Visual Abstrak: Komparasi Berdampingan', have: true },
  { label: 'Berbasis Browser (tanpa install)', have: true },
  { label: 'AI Fallback untuk Kata Baru', have: true },
  { label: 'Konten Diperbarui Guru', have: true },
]

export default function Beranda() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center rounded-full bg-green-100 px-4 py-1 text-sm font-medium text-green-700 ring-1 ring-green-200">
                Produk Inovatif · Pilmapres 2026
              </div>
              <h1 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
                Platform Pemahaman Kosakata Visual untuk Siswa{' '}
                <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                  SDLB-B
                </span>{' '}
                Tunarungu
              </h1>
              <p className="mx-auto max-w-xl text-lg text-gray-600">
                Siswa memasukkan kata melalui gestur bahasa isyarat SIBI, lalu platform menampilkan gambar visual
                maknanya—dari kata konkret hingga kata keterangan abstrak—dengan AI sebagai fallback.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-800 shadow-sm">
                  🤲 SIBI Support
                </div>
                <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 shadow-sm">
                  📸 Berbasis Browser
                </div>
                <div className="flex items-center space-x-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500"></div>
                  <span>System Online</span>
                </div>
              </div>
              <Link href="/vocab">
                <Button size="lg" className="rounded-full bg-green-600 px-8 py-3 text-lg text-white hover:bg-green-700">
                  Mulai Belajar →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Mengapa{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                kosakata visual
              </span>{' '}
              penting bagi siswa tunarungu?
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Siswa tunarungu tidak memiliki akses terhadap <em>incidental learning</em>—kemampuan menyerap kosakata
              secara pasif dari percakapan sehari-hari. Akibatnya, kesenjangan kosakata melebar signifikan di usia 8–9
              tahun.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="border-0 bg-green-50 text-center">
              <CardContent className="p-8">
                <div className="mb-2 text-5xl font-bold text-green-700">162.806</div>
                <p className="text-gray-700">
                  Siswa SLB di Indonesia tahun ajaran 2024/2025{' '}
                  <span className="text-xs text-gray-500">(Kemendikdasmen, 2025)</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-orange-50 text-center">
              <CardContent className="p-8">
                <div className="mb-2 text-5xl font-bold text-orange-700">Persentil 19</div>
                <p className="text-gray-700">
                  Rata-rata kemampuan kosakata siswa tunarungu, vs persentil 65 siswa mendengar{' '}
                  <span className="text-xs text-gray-500">(Sarchet dkk., 2014)</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-blue-50 text-center">
              <CardContent className="p-8">
                <div className="mb-2 text-5xl font-bold text-blue-700">923 ribu</div>
                <p className="text-gray-700">
                  Penduduk Indonesia yang mengalami kesulitan mendengar berat{' '}
                  <span className="text-xs text-gray-500">(BPS, 2024)</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Dibangun dengan{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                teknologi open-source
              </span>
            </h2>
            <p className="text-gray-600">Tanpa biaya lisensi—memanfaatkan ekosistem AI dan web modern.</p>
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

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Bagaimana{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                PENSyarat AI
              </span>{' '}
              bekerja?
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Siswa mengisyaratkan kata dalam SIBI → sistem mengenali → menampilkan visual makna. Untuk kata yang belum
              tersedia, AI memberikan penjelasan kontekstual sekaligus mencatat untuk pengembangan konten berikutnya.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className={`${feature.bgColor} border-0 transition-shadow hover:shadow-lg`}>
                <CardContent className="p-8 text-center">
                  <div className="relative mx-auto mb-6 h-48 w-48">
                    <Image src={feature.icon} alt={feature.title} fill className="object-contain" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="leading-relaxed text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section className="bg-green-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Satu-satunya platform yang menggabungkan{' '}
              <span className="text-green-600" style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}>
                tiga kapabilitas kritis
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Tidak ada platform serupa yang secara bersamaan mendukung input gestur SIBI real-time, visualisasi kata
              abstrak melalui komparasi, dan AI fallback untuk kata baru—semuanya berbasis browser tanpa instalasi.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <ul className="space-y-4">
              {differentiators.map((item, index) => (
                <li key={index} className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-sm">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                    ✓
                  </span>
                  <span className="font-medium text-gray-800">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-0 bg-gradient-to-r from-green-600 to-green-700 shadow-xl">
            <CardContent className="p-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">Siap mencoba PENSyarat AI?</h2>
              <p className="mb-8 text-lg text-green-100">
                Akses langsung dari browser—tidak perlu instalasi, cukup kamera standar laptop atau smartphone.
              </p>
              <Link href="/vocab">
                <Button size="lg" variant="secondary" className="rounded-full px-8 py-3 text-lg">
                  Mulai Belajar →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
