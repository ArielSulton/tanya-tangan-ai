'use client'

import Image from 'next/image'
import Link from 'next/link'

const companyLinks = [
  { name: 'Beranda', href: '/' },
  { name: 'Kamus Isyarat', href: '/vocab' },
  { name: 'Akses Khusus', href: '/akses-khusus' },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-slate-900">
      {/* Animated abstract background */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-emerald-500 mix-blend-screen blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600 opacity-50 mix-blend-screen blur-[100px]" />
        <div
          className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-green-500 mix-blend-screen blur-[80px]"
          style={{ animationDuration: '4s' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center space-x-2">
              <Image
                src="/assets/branding/pensyarat_meta.png"
                alt="PENSyarat AI"
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl shadow-sm"
                priority
              />
              <span className="text-lg font-bold text-white">
                PENSyarat <span className="text-emerald-400">AI</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm text-slate-300">
              Platform Belajar Inklusif berbasis AI dan Bahasa Isyarat SIBI untuk Siswa SLB-B Tunarungu
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-white uppercase">NAVIGASI</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-slate-300 transition-colors hover:text-emerald-400">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-white uppercase">KONTAK</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span className="text-sm text-slate-300">admin@mail.pensyarat.my.id</span>
              </div>
              <p className="text-sm text-slate-300">
                Dibuat dengan <span className="text-red-500">❤</span> untuk aksesibilitas yang lebih baik.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-slate-400">© 2026 PENSyarat AI</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
