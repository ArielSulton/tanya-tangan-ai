'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Beranda',
    href: '/',
    id: 'beranda',
  },
  {
    name: 'Belajar',
    href: '/new-vocab',
    id: 'vocabulary',
  },
  {
    name: 'Tentang',
    href: '/landing',
    id: 'about',
  },
  {
    name: 'Akses Khusus',
    href: '/akses-khusus',
    id: 'akses-khusus',
  },
]

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/assets/branding/pensyarat_meta.png"
              alt="PENSyarat AI Logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain shadow-sm"
              priority
            />
            <span className="text-lg font-bold text-gray-900">
              PENSyarat <span className="text-emerald-600">AI</span>
            </span>
          </Link>

          {/* Navigation Menu */}
          <div className="hidden items-center space-x-8 md:flex">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-emerald-600',
                    isActive ? 'border-b-2 border-emerald-600 pb-1 text-emerald-600' : 'text-slate-600',
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={mobileOpen}
              className="text-slate-600 hover:text-emerald-600 focus:text-emerald-600 focus:outline-none"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen ? (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6 lg:px-8">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-600',
                    isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600',
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
