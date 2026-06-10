'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Loader2, AlertCircle, ShieldX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── SVG icons ─────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="#5865F2" style={{ flexShrink: 0 }}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  )
}

// ── OAuth button ───────────────────────────────────────────────────────────────

interface OAuthButtonProps {
  icon: React.ReactNode
  label: string
  hoverBorder: string
  onClick: () => void
  disabled: boolean
}

function OAuthButton({ icon, label, hoverBorder, onClick, disabled }: OAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', height: 42, borderRadius: 8,
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        color: 'var(--crm-text)', fontSize: 14, fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!disabled) e.currentTarget.style.borderColor = hoverBorder
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--crm-border2)'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Main content ───────────────────────────────────────────────────────────────

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const ERROR_MESSAGES: Record<string, string> = {
    access_denied: 'Доступ запрещён. Только владельцы студии могут войти в CRM.',
    auth_failed:   'Ошибка входа через OAuth. Попробуйте снова.',
  }
  const urlErrorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? null : null
  const isAccessDenied  = errorCode === 'access_denied'

  const [loading,       setLoading]       = useState(false)
  const [oauthLoading,  setOauthLoading]  = useState<'google' | 'discord' | null>(null)
  const [error,         setError]         = useState(false)
  const [shake,         setShake]         = useState(false)

  const anyLoading = loading || oauthLoading !== null

  // ── Email/password ──

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const form     = e.currentTarget
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const { error: authError } = await createClient().auth.signInWithPassword({ email, password })

      if (authError) {
        setLoading(false)
        setError(true)
        setShake(true)
        setTimeout(() => setShake(false), 500)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      // Сетевой сбой — сбрасываем loading, чтобы кнопка не зависла
      setLoading(false)
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  // ── OAuth ──

  async function handleOAuthLogin(provider: 'google' | 'discord') {
    setOauthLoading(provider)
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      // При успехе происходит редирект; сюда попадаем только при ошибке
      if (oauthError) {
        setOauthLoading(null)
        setError(true)
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      setOauthLoading(null)
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  // ── Styles ──

  const fieldStyle: React.CSSProperties = {
    width: '100%', height: 40,
    background: 'var(--crm-s3)',
    border: '1px solid var(--crm-border2)',
    borderRadius: 8, color: 'var(--crm-text)',
    fontSize: 14, padding: '0 14px',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--crm-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 400,
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 16, padding: 40,
        animation: shake ? 'crm-shake 0.5s ease' : 'none',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <Image src="/logo.svg" alt="TheFurryDev" width={48} height={48} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--crm-text)', lineHeight: 1.2 }}>
            TheFurryDev
          </div>
          <div style={{ fontSize: 13, color: 'var(--crm-muted)', marginTop: 4 }}>
            CRM Studio
          </div>
        </div>

        {/* URL error banner */}
        {urlErrorMessage && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--crm-red)',
            marginBottom: 18,
            padding: '10px 12px',
            background: 'var(--crm-red-dim)',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {isAccessDenied
              ? <ShieldX size={14} strokeWidth={2} style={{ flexShrink: 0 }}/>
              : <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }}/>
            }
            {urlErrorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-muted)', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
            EMAIL
          </label>
          <input
            type="email"
            name="email"
            placeholder="admin@thefurry.store"
            autoComplete="email"
            required
            disabled={anyLoading}
            style={{ ...fieldStyle, marginBottom: 16, borderColor: error ? 'var(--crm-red)' : 'var(--crm-border2)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = error ? 'var(--crm-red)' : 'var(--crm-border2)' }}
          />

          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-muted)', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
            ПАРОЛЬ
          </label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={anyLoading}
            style={{ ...fieldStyle, marginBottom: error ? 12 : 24, borderColor: error ? 'var(--crm-red)' : 'var(--crm-border2)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = error ? 'var(--crm-red)' : 'var(--crm-border2)' }}
          />

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              fontSize: 13, color: 'var(--crm-red)',
              marginBottom: 18,
            }}>
              <AlertCircle size={14} strokeWidth={2} />
              Неверный email или пароль
            </div>
          )}

          <button
            type="submit"
            disabled={anyLoading}
            style={{
              width: '100%', height: 42, borderRadius: 8,
              background: 'var(--crm-blue)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: anyLoading ? 'not-allowed' : 'pointer',
              opacity: anyLoading ? 0.75 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'filter 0.15s, opacity 0.15s',
            }}
            onMouseEnter={e => { if (!anyLoading) e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            {loading && <Loader2 size={16} strokeWidth={2} style={{ animation: 'crm-spin 0.8s linear infinite' }} />}
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--crm-border2)' }} />
          <span style={{ color: 'var(--crm-muted)', fontSize: 13 }}>или войти через</span>
          <div style={{ flex: 1, height: 1, background: 'var(--crm-border2)' }} />
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <OAuthButton
            icon={oauthLoading === 'google'
              ? <Loader2 size={18} strokeWidth={2} style={{ animation: 'crm-spin 0.8s linear infinite' }} />
              : <GoogleIcon />}
            label="Google"
            hoverBorder="var(--crm-blue)"
            onClick={() => handleOAuthLogin('google')}
            disabled={anyLoading}
          />
          <OAuthButton
            icon={oauthLoading === 'discord'
              ? <Loader2 size={18} strokeWidth={2} style={{ animation: 'crm-spin 0.8s linear infinite' }} />
              : <DiscordIcon />}
            label="Discord"
            hoverBorder="#5865F2"
            onClick={() => handleOAuthLogin('discord')}
            disabled={anyLoading}
          />
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--crm-muted)', marginTop: 20 }}>
          Доступ только для сотрудников TheFurryDev
        </div>
      </div>

      <style>{`
        @keyframes crm-shake {
          0%, 100% { transform: translateX(0) }
          20%       { transform: translateX(-8px) }
          40%       { transform: translateX(8px) }
          60%       { transform: translateX(-4px) }
          80%       { transform: translateX(4px) }
        }
        @keyframes crm-spin {
          from { transform: rotate(0deg) }
          to   { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}

// ── Page export (Suspense required for useSearchParams) ────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
