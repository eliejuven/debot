'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '▦' },
  { href: '/dashboard/questions', label: 'Questions', icon: '?' },
  { href: '/dashboard/organizations', label: 'Organizations', icon: '◎' },
  { href: '/dashboard/agents', label: 'Agents', icon: '⬡' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '↗' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-surface-1 border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-7 h-7 bg-accent-blue rounded-md flex items-center justify-center">
          <span className="text-white font-mono font-bold text-xs">D</span>
        </div>
        <div>
          <div className="text-text-primary font-semibold text-sm leading-none">Debot</div>
          <div className="text-text-muted text-xs mt-0.5">Control Center</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {nav.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
              }`}
            >
              <span className="text-base w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          <span className="text-base w-4 text-center">⏻</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
