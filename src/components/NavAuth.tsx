'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'

const C = {
  border: 'rgba(82,112,200,0.2)',
  t1:     '#eef2ff',
  t2:     '#8fa3cc',
  t3:     '#4d6490',
  blue:   '#4d7cfe',
  card:   '#161c30',
}

export default function NavAuth() {
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  if (status === 'loading') {
    return <div style={{ width: 90, height: 32, borderRadius: 7, background: 'rgba(82,112,200,0.08)' }} />
  }

  if (!session) {
    return (
      <a href="/login?callbackUrl=/account" style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, borderRadius: 7, background: C.blue, color: '#fff', textDecoration: 'none', marginLeft: 6 }}>
        Sign in
      </a>
    )
  }

  const name  = session.user?.name  || session.user?.email || 'Account'
  const email = session.user?.email || ''
  const image = session.user?.image
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ position: 'relative', marginLeft: 6 }}>
      <button
        onClick={() => setMenuOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px', borderRadius: 8, background: menuOpen ? C.card : 'rgba(82,112,200,0.08)', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.t1 }}
      >
        {image
          ? <img src={image} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
        }
        <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {menuOpen && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setMenuOpen(false)} />

          {/* Dropdown */}
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 200, background: '#131829', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px', zIndex: 99, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '8px 10px 10px', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 11, color: C.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>

            <Link href="/account" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 7, fontSize: 13, color: C.t2, textDecoration: 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(82,112,200,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z"/></svg>
              My API keys
            </Link>

            <Link href="/arena" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 7, fontSize: 13, color: C.t2, textDecoration: 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(82,112,200,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Browse questions
            </Link>

            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 6 }}>
              <button onClick={() => signOut({ callbackUrl: '/' })} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
