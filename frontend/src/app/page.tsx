import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle2,
  ArrowRight,
  Hand,
  Globe,
  Radio,
  Eye,
  Scale,
  Sparkles,
  Library,
  LayoutDashboard,
} from 'lucide-react'

const techStack = [
  { name: 'YOLO Ultralytics', logo: '/assets/tech/ultralytics_yolo.svg' },
  { name: 'MediaPipe', logo: '/assets/tech/mediapipe.png' },
  { name: 'Next.js', logo: '/assets/tech/nextjs.png' },
  { name: 'LLaMA', logo: '/assets/tech/llama.png' },
  { name: 'FastAPI', logo: '/assets/tech/fastapi.png' },
  { name: 'Supabase', logo: '/assets/tech/supabase.png' },
  { name: 'Docker', logo: '/assets/tech/docker.png' },
]

const features = [
  {
    title: 'Pengenalan Gestur SIBI Real-time',
    description:
      'Siswa memasukkan kata melalui gestur bahasa isyarat SIBI via kamera browser, tanpa instalasi. YOLO Ultralytics mengenali gestur secara langsung dari frame.',
    icon: Hand,
    bgColor: 'bg-orange-50/50 hover:bg-orange-50',
    borderColor: 'border-orange-100',
    accentColor: 'bg-orange-400',
    iconColor: 'text-orange-600',
    colSpan: 'md:col-span-2 lg:col-span-2',
  },
  {
    title: 'Visualisasi Kata Konkret',
    description:
      'Untuk kata benda seperti "kucing", "apel", atau "pohon", platform menampilkan foto objek nyata beserta label kata agar makna tersampaikan secara visual.',
    icon: Eye,
    bgColor: 'bg-green-50/50 hover:bg-green-50',
    borderColor: 'border-green-100',
    accentColor: 'bg-green-400',
    iconColor: 'text-green-600',
    colSpan: 'md:col-span-1 lg:col-span-1',
  },
  {
    title: 'Komparasi Visual Kata Abstrak',
    description:
      'Untuk keterangan abstrak seperti "sedikit", "agak", "sangat", dan "terlalu", platform menampilkan gambar berdampingan yang merepresentasikan derajat makna secara konkret.',
    icon: Scale,
    bgColor: 'bg-purple-50/50 hover:bg-purple-50',
    borderColor: 'border-purple-100',
    accentColor: 'bg-purple-400',
    iconColor: 'text-purple-600',
    colSpan: 'md:col-span-1 lg:col-span-1',
  },
  {
    title: 'AI Fallback (LLaMA 3.3)',
    description:
      'Jika kata belum tersedia di basis data, sistem menggunakan LLaMA 3.3 via ChatGroq untuk memberikan saran kata terdekat dan penjelasan singkat kontekstual.',
    icon: Sparkles,
    bgColor: 'bg-emerald-50/50 hover:bg-emerald-50',
    borderColor: 'border-emerald-100',
    accentColor: 'bg-emerald-400',
    iconColor: 'text-emerald-600',
    colSpan: 'md:col-span-2 lg:col-span-2',
  },
  {
    title: 'Kategori Kosakata Terstruktur',
    description:
      'Kosakata dikelompokkan dalam lima kategori: Hewan, Benda, Alam, Perasaan, dan Keterangan Abstrak, sesuai materi Bahasa Indonesia Kurikulum Merdeka SDLB-B.',
    icon: Library,
    bgColor: 'bg-pink-50/50 hover:bg-pink-50',
    borderColor: 'border-pink-100',
    accentColor: 'bg-pink-400',
    iconColor: 'text-pink-600',
    colSpan: 'md:col-span-2 lg:col-span-2',
  },
  {
    title: 'Dashboard Admin Guru',
    description:
      'Guru dapat menambah, memperbarui, dan mengelola kosakata beserta gambar secara mandiri. Sistem juga mencatat kata yang sering dicari untuk prioritas pengembangan konten.',
    icon: LayoutDashboard,
    bgColor: 'bg-indigo-50/50 hover:bg-indigo-50',
    borderColor: 'border-indigo-100',
    accentColor: 'bg-indigo-400',
    iconColor: 'text-indigo-600',
    colSpan: 'md:col-span-1 lg:col-span-1',
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
    <div className="min-h-screen bg-slate-50 selection:bg-green-200 selection:text-green-900">
      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden py-20">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 bg-white">
          <Image src="/assets/hero_landing_page.png" alt="Hero Background" fill className="object-cover" priority />
          {/* Light overlay to ensure text readability */}
          <div className="absolute inset-0 bg-white/30" />
          {/* Subtle animated gradients */}
          <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-emerald-300/20 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-teal-300/20 blur-[100px]" />
          <div className="absolute -bottom-[20%] left-[20%] h-[600px] w-[600px] rounded-full bg-green-300/10 blur-[150px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-slate-50" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="max-w-4xl space-y-8">
              <div className="inline-flex items-center rounded-full border border-emerald-100 bg-white/80 px-4 py-1.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur-md">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                Produk Inovatif · Pilmapres 2026
              </div>

              <h1 className="text-5xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Platform Pemahaman Kosakata Visual untuk Siswa{' '}
                <span
                  className="relative inline-block bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"
                  style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}
                >
                  SDLB-B
                </span>{' '}
                Tunarungu Tingkat Pemula
              </h1>

              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                Siswa memasukkan kata melalui gestur bahasa isyarat SIBI, lalu platform menampilkan gambar visual
                maknanya. Dari kata keterangan abstrak hingga kata konkret dengan teknologi AI.
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white">
                  <Hand className="h-4 w-4 text-emerald-600" />
                  <span>SIBI Support</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  <span>Berbasis Browser</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white">
                  <Radio className="h-4 w-4 animate-pulse text-emerald-600" />
                  <span>System Online</span>
                </div>
              </div>

              <div className="pt-8">
                <Link href="/vocab">
                  <Button
                    size="lg"
                    className="group h-14 rounded-full border-none bg-emerald-500 px-8 text-lg font-semibold text-white shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:scale-105 hover:bg-emerald-400 hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.7)]"
                  >
                    Mulai Belajar
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="relative z-20 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="sr-only mb-16 text-center">
          <h2>Statistik Pentingnya Kosakata Visual</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
              <div className="absolute -top-12 -left-12 h-48 w-48 scale-125 rounded-full bg-emerald-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
              <div className="absolute -right-12 -bottom-12 h-48 w-48 scale-125 rounded-full bg-emerald-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
            </div>
            <div className="relative z-10 flex h-full flex-col p-8 sm:p-10">
              <div className="mb-6 h-2 w-16 rounded-full bg-emerald-500" />
              <div className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900">162.806</div>
              <p className="font-medium text-slate-600">Siswa SLB di Indonesia tahun ajaran 2024/2025</p>
              <p className="mt-auto pt-6 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Kemendikdasmen, 2025
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
              <div className="absolute -top-12 -left-12 h-48 w-48 scale-125 rounded-full bg-orange-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
              <div className="absolute -right-12 -bottom-12 h-48 w-48 scale-125 rounded-full bg-orange-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
            </div>
            <div className="relative z-10 flex h-full flex-col p-8 sm:p-10">
              <div className="mb-6 h-2 w-16 rounded-full bg-orange-500" />
              <div className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900">Persentil 19</div>
              <p className="font-medium text-slate-600">
                Rata-rata kemampuan kosakata siswa tunarungu, vs persentil 65 siswa mendengar
              </p>
              <p className="mt-auto pt-6 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Sarchet dkk., 2014
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
              <div className="absolute -top-12 -left-12 h-48 w-48 scale-125 rounded-full bg-blue-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
              <div className="absolute -right-12 -bottom-12 h-48 w-48 scale-125 rounded-full bg-blue-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
            </div>
            <div className="relative z-10 flex h-full flex-col p-8 sm:p-10">
              <div className="mb-6 h-2 w-16 rounded-full bg-blue-500" />
              <div className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900">923 ribu</div>
              <p className="font-medium text-slate-600">Penduduk Indonesia yang mengalami kesulitan mendengar berat</p>
              <p className="mt-auto pt-6 text-xs font-semibold tracking-wider text-slate-400 uppercase">BPS, 2024</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-slate-600">
            Siswa tunarungu tidak memiliki akses terhadap{' '}
            <strong className="font-semibold text-slate-900">incidental learning</strong>—kemampuan menyerap kosakata
            secara pasif dari percakapan sehari-hari. Akibatnya, kesenjangan kosakata melebar signifikan di usia 8–9
            tahun.
          </p>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-sm font-bold tracking-widest text-emerald-600 uppercase">Teknologi Open-Source</h2>
            <p className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Dibangun dengan{' '}
              <span
                className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"
                style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}
              >
                standar modern
              </span>
            </p>
            <p className="mt-4 text-slate-600">Tanpa biaya lisensi—memanfaatkan ekosistem AI dan web terbaik.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className="group flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:ring-emerald-100"
              >
                <div className="relative mb-3 h-12 w-12 sm:h-14 sm:w-14">
                  <Image
                    src={tech.logo}
                    alt={tech.name}
                    fill
                    className="object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
                <p className="text-center text-xs font-semibold text-slate-500 transition-colors group-hover:text-slate-900">
                  {tech.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="border-y border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-sm font-bold tracking-widest text-emerald-600 uppercase">Kapabilitas Utama</h2>
            <p className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Bagaimana{' '}
              <span
                className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"
                style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}
              >
                PENSyarat AI
              </span>{' '}
              bekerja?
            </p>
            <p className="mt-6 text-lg text-slate-600">
              Siswa mengisyaratkan kata dalam SIBI → sistem mengenali → menampilkan visual makna. Untuk kata yang belum
              tersedia, AI memberikan penjelasan kontekstual sekaligus mencatat untuk pengembangan konten berikutnya.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-[2.5rem] border ${feature.borderColor} ${feature.bgColor} ${feature.colSpan} shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl`}
              >
                {/* CTA-style Animated abstract background */}
                <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
                  <div
                    className={`absolute -top-12 -left-12 h-48 w-48 rounded-full ${feature.accentColor} scale-125 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150`}
                  />
                  <div
                    className={`absolute -right-12 -bottom-12 h-48 w-48 rounded-full ${feature.accentColor} scale-125 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150`}
                  />
                </div>

                <div className="relative z-10 flex h-full flex-col p-8 sm:p-10">
                  <div className="mb-8 flex items-center justify-between">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-110 ${feature.iconColor}`}
                    >
                      <feature.icon className="h-8 w-8" />
                    </div>
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="flex-grow leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section className="relative overflow-hidden py-24">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -z-10 -mt-48 -mr-48 h-[800px] w-[800px] rounded-full bg-emerald-50/50 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl leading-tight font-bold text-slate-900 sm:text-4xl">
                Satu-satunya platform yang menggabungkan{' '}
                <span className="relative whitespace-nowrap">
                  <span
                    className="relative z-10 text-emerald-600"
                    style={{ fontFamily: 'var(--font-covered-by-your-grace)' }}
                  >
                    tiga kapabilitas kritis
                  </span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full text-emerald-200"
                    viewBox="0 0 318 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3.5 9.5C65.8333 4.16667 210.3 -4.5 314.5 9.5"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-slate-600">
                Tidak ada platform serupa yang secara bersamaan mendukung input gestur SIBI real-time, visualisasi kata
                abstrak melalui komparasi, dan AI fallback untuk kata baru—semuanya berbasis browser tanpa instalasi.
              </p>

              <div className="mt-10 border-t border-slate-200 pt-10">
                <Link href="/vocab">
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-emerald-200 px-6 font-semibold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    Jelajahi Kosakata
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 scale-105 rotate-3 transform rounded-3xl bg-gradient-to-tr from-emerald-100 to-teal-50" />
              <Card className="overflow-hidden rounded-3xl border-0 bg-white/80 shadow-2xl shadow-emerald-900/5 backdrop-blur-xl">
                <CardContent className="p-8 sm:p-10">
                  <ul className="space-y-6">
                    {differentiators.map((item, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-lg font-semibold text-slate-800">{item.label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-20 text-center shadow-2xl sm:px-16 sm:py-24">
          {/* Animated abstract background */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute -top-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-emerald-500 mix-blend-screen blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600 opacity-50 mix-blend-screen blur-[100px]" />
            <div
              className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-green-500 mix-blend-screen blur-[80px]"
              style={{ animationDuration: '4s' }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Siap mencoba PENSyarat AI?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-xl leading-relaxed text-emerald-100/80">
              Akses langsung dari browser, tidak perlu instalasi, cukup kamera standar laptop atau smartphone.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/vocab">
                <Button
                  size="lg"
                  className="h-14 rounded-full border-none bg-white px-8 text-lg font-bold text-slate-900 shadow-xl transition-all hover:scale-105 hover:bg-slate-50 hover:shadow-2xl hover:shadow-white/20"
                >
                  Mulai Belajar Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
