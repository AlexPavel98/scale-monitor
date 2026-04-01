'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'
import { Scale, Globe } from 'lucide-react'

export default function LoginPage() {
  const { t, lang, setLang } = useLang()
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    })
    setLoading(false)
    if (err) {
      setError(lang === 'da' ? 'Ugyldig kode' : 'Invalid code')
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

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="glass p-6 space-y-4">
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
              {loading
                ? t.common.loading
                : lang === 'da' ? 'Send login kode' : 'Send login code'
              }
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="glass p-6 space-y-4">
            <p className="text-sm text-content-muted text-center">
              {lang === 'da'
                ? `En kode er sendt til ${email}`
                : `A code has been sent to ${email}`
              }
            </p>
            <div>
              <label className="text-xs font-medium text-content-muted mb-1 block">
                {lang === 'da' ? 'Kode' : 'Code'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                className="glass-input text-center text-2xl tracking-[0.3em] font-mono"
                maxLength={8}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || otpCode.length < 6} className="btn-primary w-full text-sm disabled:opacity-40">
              {loading ? t.common.loading : t.login.signIn}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtpCode(''); setError('') }}
              className="w-full text-sm text-content-muted hover:text-content transition-colors"
            >
              {lang === 'da' ? 'Skift email' : 'Change email'}
            </button>
          </form>
        )}

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
