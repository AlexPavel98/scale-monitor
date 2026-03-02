'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'
import { Scale, Globe } from 'lucide-react'

export default function LoginPage() {
  const { t, lang, setLang } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(t.login.error)
      setLoading(false)
      return
    }
    window.location.href = '/'
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--brand-primary-bg)' }}>
            <Scale size={32} className="text-brand-primary" />
          </div>
          <h1 className="text-2xl font-bold text-content">Scale Monitor</h1>
          <p className="text-sm text-content-muted mt-1">Palm Kartofler</p>
        </div>

        <form onSubmit={handleLogin} className="glass p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.login.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="glass-input"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.login.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="glass-input"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
            {loading ? t.common.loading : t.login.signIn}
          </button>
        </form>

        <div className="flex justify-center mt-4">
          <button
            onClick={() => setLang(lang === 'da' ? 'en' : 'da')}
            className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content transition-colors"
          >
            <Globe size={14} />
            {lang === 'da' ? 'English' : 'Dansk'}
          </button>
        </div>
      </div>
    </div>
  )
}
