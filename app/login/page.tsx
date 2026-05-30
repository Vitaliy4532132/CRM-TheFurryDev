'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)
  const [shake, setShake]     = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const form = e.currentTarget
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

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
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    background: 'var(--crm-s3)',
    border: '1px solid var(--crm-border2)',
    borderRadius: 8,
    color: 'var(--crm-text)',
    fontSize: 14,
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--crm-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div
        style={{
          width: 400,
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          borderRadius: 16,
          padding: 40,
          animation: shake ? 'crm-shake 0.5s ease' : 'none',
        }}
      >
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
            disabled={loading}
            style={{
              width: '100%', height: 42, borderRadius: 8,
              background: 'var(--crm-blue)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'filter 0.15s, opacity 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            {loading && <Loader2 size={16} strokeWidth={2} style={{ animation: 'crm-spin 0.8s linear infinite' }} />}
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

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
