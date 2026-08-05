import Image from 'next/image'
import Link from 'next/link'
import {
  Star,
  PawPrint,
  Rocket,
  Lightbulb,
  Smile,
  Eye,
  Bot,
  Hand,
  Sparkle,
  Image as ImageIcon,
  Heart,
  GraduationCap,
  BookOpen,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="bg-white text-slate-950 selection:bg-emerald-200 selection:text-emerald-900">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[3rem] border-2 border-dashed border-emerald-200/70 bg-gradient-to-b from-[#e3f8ef] to-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.06)] sm:p-10">
            {/* decorative star */}
            <div className="absolute top-8 right-8 text-amber-400">
              <Star className="h-6 w-6" strokeWidth={2} />
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="space-y-7">
                <div
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-amber-300 bg-white px-5 py-2 text-base font-medium text-amber-600 italic shadow-sm"
                  style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                >
                  Halo Teman-teman! Selamat Datang! 👋
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    Ayo Petualangan Memahami{' '}
                    <span className="relative inline-block text-emerald-600">
                      Kosakata
                      <svg
                        className="absolute -bottom-1 left-0 w-full"
                        viewBox="0 0 200 12"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 9 Q100 2 198 9"
                          stroke="#f59e0b"
                          strokeWidth="5"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </h1>

                  {/* paragraph in accent-bordered card */}
                  <div className="max-w-xl rounded-r-xl border-l-4 border-emerald-500 bg-slate-50/70 px-5 py-4">
                    <p className="text-lg leading-8 text-slate-600 sm:text-xl">
                      Cukup pakai kamera, peragakan isyarat SIBI, dan temukan dunia gambar yang luar biasa bersama Kiki
                      si Kucing!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative">
                    {/* floating sparkle marks */}
                    <span className="absolute -bottom-3 -left-4 text-sky-400">✦</span>
                    <span className="absolute -top-2 -left-6 text-xs text-sky-300">✦</span>
                    <Link
                      href="/new-vocab"
                      className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-500"
                    >
                      Mulai Belajar!
                    </Link>
                  </div>
                  {/* <Link
                    href="#cara-main"
                    className="inline-flex items-center justify-center rounded-full border border-dashed border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-700 transition duration-200 hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Cara Main
                  </Link> */}
                </div>
              </div>

              <div className="relative mx-auto max-w-xl">
                {/* soft blue glow behind the image */}
                <div className="absolute top-1/2 -right-8 h-40 w-40 -translate-y-1/2 rounded-full bg-sky-200/60 blur-3xl" />

                {/* "Seru!" tag near the image */}
                <div className="absolute -top-8 left-4 z-10 flex -rotate-6 items-center gap-1 text-lg text-sky-500">
                  <Sparkle className="h-4 w-4" fill="currentColor" />
                  <span className="font-serif italic">Seru!</span>
                </div>

                <div className="relative rotate-2 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
                  <Image
                    src="/assets/landing/hero-illustration.png"
                    alt="Ilustrasi kelas interaktif dengan Kiki si Kucing"
                    width={840}
                    height={620}
                    className="h-full w-full rounded-[2rem] object-cover"
                    priority
                  />
                </div>

                <div className="absolute -bottom-5 -left-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-white shadow-xl ring-4 ring-white">
                  <PawPrint className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= KENALAN YUK ================= */}
      <section className="relative overflow-hidden bg-[#fdf5ec] py-16 sm:py-20">
        {/* wave divider transitioning from the section above */}
        <div className="absolute top-0 left-0 w-full -translate-y-[1px] overflow-hidden">
          <svg viewBox="0 0 1440 100" className="h-16 w-full sm:h-24" preserveAspectRatio="none">
            <path d="M0,40 C360,100 1080,0 1440,50 L1440,0 L0,0 Z" fill="#ffffff" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white shadow-md">
              <Hand className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Kenalan yuk sama <span className="text-emerald-600">PENSyarat AI!</span>
            </h2>
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <p className="text-base leading-7 text-slate-600">
                PENSyarat AI itu seperti teman pintar yang bisa membaca gerakan tanganmu! Kamu bisa belajar kata-kata
                baru dengan cara yang seru banget, lho! 🚀
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="flex flex-col items-center rounded-[2rem] border-2 border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Kata Abstrak</h3>
              <p className="mt-3 max-w-xs text-slate-600">
                Kata-kata sulit jadi gampang dimengerti lewat gambar yang asyik!
              </p>
              {/* <Link
                href="#"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                Lihat Contoh <ArrowRight className="h-4 w-4" />
              </Link> */}
            </article>

            <article className="flex flex-col items-center rounded-[2rem] border-2 border-dashed border-sky-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <ImageIcon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Kata konkrit</h3>
              <p className="mt-3 max-w-xs text-slate-600">
                Lihat foto asli benda-benda di sekitarmu. Belajar jadi makin nyata!
              </p>
              {/* <Link
                href="#"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Lihat Contoh <ArrowRight className="h-4 w-4" />
              </Link> */}
            </article>
          </div>
        </div>
      </section>

      {/* ================= PILIH TOPIK ================= */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="relative inline-block text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Pilih Topik Belajarmu
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 220 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M2 7 Q110 1 218 7" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </h2>
            <p className="mt-6 text-base text-slate-600">
              Temukan ribuan kosakata yang dikelompokkan sesuai Kurikulum Merdeka.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Kata Abstrak',
                color: 'text-emerald-600',
                description:
                  'Pelajari kata sifat, kata hubung, dan keterangan abstrak untuk memberikan detail dan makna pada kalimat.',
                image: '/assets/landing/topic-abstrak.png',
              },
              {
                title: 'Kata Konkrit',
                color: 'text-orange-500',
                description:
                  'Kata benda nyata yang mudah dikenali secara visual, mencakup pengenalan hewan, benda sehari-hari, dan alam sekitar.',
                image: '/assets/landing/topic-konkrit.png',
              },
              {
                title: 'Coba Kalimat',
                color: 'text-sky-500',
                description:
                  'Latih susunan kalimatmu lewat kamera, dari level dasar sampai lanjut, langsung dapat koreksi.',
                image: '/assets/landing/topic-kalimat.png',
              },
            ].map((topic) => (
              <article
                key={topic.title}
                className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-48">
                  <Image src={topic.image} alt={topic.title} fill className="object-cover" />
                </div>
                <div className="space-y-3 p-6">
                  <h3 className={`text-xl font-bold ${topic.color}`}>{topic.title}</h3>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-600">{topic.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= MENGAPA COCOK ================= */}
      <section className="relative overflow-hidden bg-[#eef1ee] py-16 sm:py-20">
        {/* wave divider transitioning from the section above */}
        <div className="absolute top-0 left-0 w-full -translate-y-[1px] overflow-hidden">
          <svg viewBox="0 0 1440 100" className="h-16 w-full sm:h-24" preserveAspectRatio="none">
            <path d="M0,40 C360,100 1080,0 1440,50 L1440,0 L0,0 Z" fill="#ffffff" />
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="relative mx-auto max-w-md">
              {/* decorative outline heart */}
              <Heart className="absolute top-1/2 -left-10 hidden h-5 w-5 -translate-y-1/2 text-amber-300 lg:block" />

              <div className="relative -rotate-2 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-3 shadow-xl">
                <Image
                  src="/assets/landing/section-hero-cat.png"
                  alt="Kiki si Kucing belajar bersama anak"
                  width={1000}
                  height={800}
                  className="h-full w-full rounded-[2rem] object-cover"
                />
                <div className="absolute -right-4 -bottom-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg">
                  <Smile className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[2.5rem] border-2 border-dashed border-emerald-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">Mengapa PENSyarat Cocok untuk Siswa?</h2>
              <div className="mt-8 space-y-6">
                {[
                  {
                    icon: Eye,
                    color: 'bg-emerald-100 text-emerald-600',
                    title: 'Pendekatan Visual Kuat',
                    description: 'Setiap kata memiliki foto nyata atau perbandingan gambar agar mudah dipahami.',
                  },
                  {
                    icon: Bot,
                    color: 'bg-sky-100 text-sky-600',
                    title: 'Kecerdasan Buatan (AI)',
                    description: 'Jika kata belum ada, AI akan memberikan saran kata terdekat yang mudah dipelajari.',
                  },
                  {
                    icon: Smile,
                    color: 'bg-orange-100 text-orange-600',
                    title: 'Mandiri & Menyenangkan',
                    description: 'Siswa bisa belajar sendiri tanpa harus menunggu bantuan guru setiap saat.',
                  },
                ].map((item) => (
                  <div key={item.title}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                    </div>
                    <div className="mt-2 ml-[52px] rounded-xl bg-slate-100/80 px-4 py-3">
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= KENAPA BELAJAR BERSAMA ================= */}
      <section className="relative overflow-hidden bg-white py-16 sm:py-20">
        {/* dekorasi kecil */}
        <GraduationCap className="absolute top-6 right-6 h-6 w-6 text-slate-300" />
        <Lightbulb className="absolute bottom-4 left-8 h-6 w-6 text-amber-300/80" strokeWidth={1.5} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            {/* KIRI */}
            <div className="space-y-6">
              <div
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-5 py-2 text-lg font-bold text-white shadow-md"
                style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
              >
                Tahukah Kamu?
                <Lightbulb className="h-4 w-4 fill-amber-200 text-amber-100" />
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Kenapa Kita Belajar Bersama?
              </h2>

              <div className="max-w-xl rounded-2xl border-2 border-dashed border-slate-300 p-5">
                <p className="text-base leading-7 text-slate-600">
                  Banyak teman-teman kita yang kesulitan belajar kata-kata baru karena kurangnya gambar yang seru.
                  PENSyarat AI hadir untuk membantu semua anak Indonesia jadi juara kosakata!
                </p>
              </div>

              <div className="relative max-w-xl">
                <div className="absolute inset-0 translate-y-2 rounded-[1.75rem] bg-slate-200/60" />
                <div className="relative flex gap-4 rounded-[1.75rem] bg-[#fdf5ef] p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p
                    className="pt-1 text-base leading-7 text-slate-600"
                    style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                  >
                    &ldquo;Belajar dengan gambar membantu otak kita mengingat 3x lebih cepat daripada hanya membaca
                    tulisan saja!&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* KANAN */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute inset-0 translate-y-2 rounded-[1.75rem] bg-sky-100" />
                  <div className="relative rounded-[1.75rem] bg-sky-50 p-6 text-center shadow-sm">
                    <p
                      className="text-4xl font-bold text-sky-500"
                      style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                    >
                      162rb+
                    </p>
                    <p className="mt-3 inline-block -rotate-1 rounded-lg border-2 border-dashed border-blue-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                      Teman Hebat di SLB
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 translate-y-2 rounded-[1.75rem] bg-orange-100" />
                  <div className="relative rounded-[1.75rem] bg-orange-50 p-6 text-center shadow-sm">
                    <p
                      className="text-4xl font-bold text-orange-500"
                      style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                    >
                      923rb
                    </p>
                    <p className="mt-3 inline-block rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                      Anak Luar Biasa
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 translate-y-2 rounded-[2rem] bg-amber-300" />
                <div className="relative rounded-[2rem] bg-gradient-to-br from-amber-400 to-amber-500 p-7 text-center text-white shadow-lg">
                  <p
                    className="text-3xl font-bold sm:text-4xl"
                    style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive" }}
                  >
                    Inovasi Juara 2026
                  </p>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50/90 px-4 py-1.5 text-sm font-semibold text-amber-700">
                    Dibuat khusus untuk anak-anak Indonesia! 🎉
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="relative overflow-hidden bg-white py-16 sm:py-20">
        {/* subtle warm background wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-orange-50/30 to-orange-50/60" />

        {/* soft glow behind the button */}
        <div className="pointer-events-none absolute top-[65%] left-1/2 -z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/40 blur-3xl" />

        {/* full-width dashed divider */}
        <div className="absolute top-0 right-0 left-0 border-t-[3px] border-dashed border-emerald-200" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl pt-14 text-center">
            <Rocket className="mx-auto h-7 w-7 text-amber-400" />

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Siap Belajar Bersama Kami?
            </h2>

            <div className="mt-6 rounded-2xl bg-white px-6 py-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.15)]">
              <p className="text-base leading-7 text-slate-600">
                Akses langsung dari browser, tidak perlu instalasi, cukup gunakan kamera laptop atau smartphone.
              </p>
            </div>

            <Link
              href="/new-vocab"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-orange-400 to-orange-500 px-9 py-3.5 text-white shadow-[0_25px_50px_-15px_rgba(249,115,22,0.65)] transition hover:-translate-y-0.5 hover:from-orange-400 hover:to-orange-400"
            >
              <span className="font-['Caveat'] text-2xl">Mulai Belajar Sekarang!</span>
              <span>✨</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
