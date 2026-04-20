'use client'

import { useState, useEffect } from 'react'
import { AuthStatus } from '@/components/auth/auth-components'
import { CheckCircle, Users, ShieldCheck, KeyRound, Fingerprint } from 'lucide-react'

// Force dynamic rendering and disable static optimization
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function AksesKhusus() {
  const [isMounted, setIsMounted] = useState(false)

  // Client-side mounting check
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent server-side rendering of auth hooks
  if (!isMounted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600"></div>
            <p className="mt-4 font-medium text-slate-500">Memuat sistem keamanan...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 selection:bg-emerald-200">
      {/* Premium Glowing Ambient Orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-200/40 mix-blend-multiply blur-[100px]"></div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-blue-200/40 mix-blend-multiply blur-[100px]"></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-100/40 mix-blend-multiply blur-[80px]"></div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* Header Section */}
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-100/50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Sistem Terenkripsi</span>
            </div>
            <h1 className="mb-6 text-4xl leading-tight font-extrabold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Akses{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Khusus Admin
              </span>
            </h1>
            <p className="text-lg leading-relaxed font-medium text-slate-600">
              Area ini dibatasi hanya untuk administrator yang telah diverifikasi. Silakan masuk untuk mengelola sistem,
              kosakata, dan memantau performa.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            {/* Left Column: Features (Bento Style) */}
            <div className="grid h-full grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-[2.5rem] border border-blue-100 bg-blue-50/50 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:bg-blue-50 hover:shadow-2xl sm:col-span-2">
                {/* CTA-style Animated abstract background */}
                <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
                  <div className="absolute -top-12 -left-12 h-48 w-48 scale-125 rounded-full bg-blue-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
                  <div className="absolute -right-12 -bottom-12 h-48 w-48 scale-125 rounded-full bg-blue-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
                </div>

                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 p-8 text-center sm:p-10">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[1.5rem] bg-white text-blue-600 shadow-sm ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-110">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-800">Keamanan Terjamin</h3>
                    <p className="mx-auto max-w-md leading-relaxed font-medium text-slate-600">
                      Enkripsi end-to-end dengan standar industri untuk melindungi semua akses admin dan manipulasi
                      data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-[2.5rem] border border-purple-100 bg-purple-50/50 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:bg-purple-50 hover:shadow-2xl">
                {/* CTA-style Animated abstract background */}
                <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
                  <div className="absolute -top-12 -left-12 h-48 w-48 scale-125 rounded-full bg-purple-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
                  <div className="absolute -right-12 -bottom-12 h-48 w-48 scale-125 rounded-full bg-purple-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
                </div>

                <div className="relative z-10 flex h-full flex-col p-8 sm:p-10">
                  <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white text-purple-600 shadow-sm ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-110">
                    <Users className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-800">Role-Based Access</h3>
                  <p className="text-sm leading-relaxed font-medium text-slate-600">
                    Otoritas sistem disesuaikan secara ketat berdasarkan tingkatan peran.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-[2.5rem] border border-orange-100 bg-orange-50/50 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:bg-orange-50 hover:shadow-2xl">
                {/* CTA-style Animated abstract background */}
                <div className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
                  <div className="absolute -top-12 -left-12 h-48 w-48 scale-125 rounded-full bg-orange-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
                  <div className="absolute -right-12 -bottom-12 h-48 w-48 scale-125 rounded-full bg-orange-400 mix-blend-multiply blur-[40px] transition-transform duration-700 group-hover:scale-150" />
                </div>

                <div className="relative z-10 flex h-full flex-col p-8 sm:p-10">
                  <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white text-orange-500 shadow-sm ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-110">
                    <Fingerprint className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-800">Verifikasi Berlapis</h3>
                  <p className="text-sm leading-relaxed font-medium text-slate-600">
                    Sistem autentikasi yang solid untuk mencegah masuknya pihak yang tidak sah.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Auth Section */}
            <div className="h-full lg:col-span-5">
              <div className="group relative flex h-full flex-col justify-between rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl transition-all hover:shadow-emerald-500/10 sm:p-10">
                <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-white/60 to-white/30" />

                <div className="relative z-10 flex flex-grow flex-col">
                  <div className="mt-2 mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
                      <KeyRound className="h-8 w-8" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">Masuk ke Portal</h2>
                    <p className="font-medium text-slate-600">Verifikasi identitas Anda untuk melanjutkan</p>
                  </div>

                  <div className="flex flex-grow items-center justify-center">
                    <div className="w-full">
                      <AuthStatus />
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-200/60 pt-6 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Butuh akses? Hubungi{' '}
                      <a
                        href="#"
                        className="text-emerald-600 underline decoration-emerald-600/30 underline-offset-4 hover:text-emerald-700"
                      >
                        Superadmin
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
