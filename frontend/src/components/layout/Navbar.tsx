'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Beranda',
    href: '/',
    id: 'beranda',
  },
  {
    name: 'Kamus Isyarat',
    href: '/vocab',
    id: 'vocabulary',
  },
  {
    name: 'Akses Khusus',
    href: '/akses-khusus',
    id: 'akses-khusus',
  },
]

export function Navbar() {
  const pathname = usePathname()

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
              className="text-slate-600 hover:text-emerald-600 focus:text-emerald-600 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
