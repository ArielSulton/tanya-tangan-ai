'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Beranda',
    href: '/',
    id: 'beranda',
  },
  {
    name: 'Tentang',
    href: '/tentang',
    id: 'tentang',
  },
  {
    name: 'Mata Pelajaran',
    href: '/layanan',
    id: 'layanan',
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
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 shadow-sm">
              <span className="text-sm font-bold text-white">TT</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              Tanya Tangan <span className="text-green-600">AI</span>
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
                    'text-sm font-medium transition-colors hover:text-green-600',
                    isActive ? 'border-b-2 border-green-600 pb-1 text-green-600' : 'text-gray-700',
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
              className="text-gray-700 hover:text-green-600 focus:text-green-600 focus:outline-none"
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
