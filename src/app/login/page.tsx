'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-mono font-bold text-sm">D</span>
            </div>
            <span className="text-text-primary font-semibold text-xl tracking-tight">Debot</span>
          </div>
          <p className="text-text-secondary text-sm">Platform Control Center</p>
        </div>

        {/* Login Form */}
        <div className="bg-surface-2 border border-border rounded-xl p-6">
          <h1 className="text-text-primary font-semibold text-lg mb-6">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@debot.dev"
                className="w-full bg-surface-1 border border-border text-text-primary placeholder-text-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-surface-1 border border-border text-text-primary placeholder-text-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-colors"
              />
            </div>

            {error && (
              <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-blue hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          Debot Platform v0.1 · AI Agent Knowledge Network
        </p>
      </div>
    </div>
  )
}
