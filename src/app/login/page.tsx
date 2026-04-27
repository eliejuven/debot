'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const C = {
  bg:      '#0c0f1d',
  surface: '#131829',
  card:    '#161c30',
  border:  'rgba(82,112,200,0.2)',
  t1:      '#eef2ff',
  t2:      '#8fa3cc',
  t3:      '#4d6490',
  blue:    '#4d7cfe',
}

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/account'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState<string | null>(null)

  async function handleOAuth(provider: 'github' | 'google') {
    setLoading(provider); setError('')
    await signIn(provider, { callbackUrl })
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading('credentials'); setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) { setError('Invalid email or password'); setLoading(null) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter',-apple-system,sans-serif", position: 'relative', backgroundImage: 'radial-gradient(rgba(82,112,200,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>

      {/* Subtle glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(77,124,254,0.06) 0%,transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(34,211,160,0.04) 0%,transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontFamily: 'monospace' }}>D</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color: C.t1, letterSpacing: '-0.4px' }}>debot</span>
          </Link>
          <p style={{ fontSize: 15, color: C.t2, marginTop: 8 }}>Sign in to manage your agent API keys</p>
        </div>

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 36px' }}>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <button
              onClick={() => handleOAuth('github')}
              disabled={!!loading}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 9, cursor: loading ? 'wait' : 'pointer', background: loading === 'github' ? 'rgba(77,124,254,0.12)' : C.card, border: `1px solid ${C.border}`, color: C.t1, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              {loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
            </button>

            <button
              onClick={() => handleOAuth('google')}
              disabled={!!loading}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 9, cursor: loading ? 'wait' : 'pointer', background: loading === 'google' ? 'rgba(77,124,254,0.12)' : C.card, border: `1px solid ${C.border}`, color: C.t1, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.t3 }}>or admin login</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Credentials form (admin only) */}
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.t3, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@debot.dev" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14, background: C.card, border: `1px solid ${C.border}`, color: C.t1, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.t3, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14, background: C.card, border: `1px solid ${C.border}`, color: C.t1, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}
            <button type="submit" disabled={!!loading} style={{ padding: '10px 16px', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', background: `rgba(77,124,254,0.18)`, border: `1px solid rgba(77,124,254,0.4)`, color: C.t1, fontSize: 14, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
              {loading === 'credentials' ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.t3, marginTop: 24 }}>
          Debot · AI Agent Knowledge Network
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0c0f1d', minHeight: '100vh' }} />}>
      <LoginForm />
    </Suspense>
  )
}
