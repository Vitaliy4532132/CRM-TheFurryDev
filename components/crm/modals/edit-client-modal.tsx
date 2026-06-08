'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { updateCRMClient } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import type { CRMClient } from '@/types/crm'

interface EditClientModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  client: CRMClient | null
}

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)', fontSize: 13,
  padding: '0 12px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const taStyle: React.CSSProperties = { ...fieldStyle, height: 90, padding: '10px 12px', resize: 'vertical' }
const lbStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--crm-muted)',
  marginBottom: 6, display: 'block', letterSpacing: '0.04em',
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={lbStyle}>{label}</label>
      {children}
    </div>
  )
}
function fb(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)'
}
function ub(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)'
}

export function EditClientModal({ open, onClose, onSuccess, client }: EditClientModalProps) {
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [form, setForm]       = useState({ name: '', telegram: '', discord: '', email: '', country: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Заполняем форму данными клиента при открытии
  useEffect(() => {
    if (client) {
      setForm({
        name:     client.name ?? '',
        telegram: client.telegram ?? '',
        discord:  client.discord  ?? '',
        email:    client.email    ?? '',
        country:  client.country  ?? '',
        note:     client.note     ?? '',
      })
      setError(null)
    }
  }, [client])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit() {
    if (!client) return
    if (!form.name.trim()) { setError('Укажите имя клиента'); return }
    setLoading(true)
    setError(null)
    try {
      await updateCRMClient(client.id, {
        name:     form.name.trim(),
        telegram: form.telegram.trim() || null,
        discord:  form.discord.trim()  || null,
        email:    form.email.trim()    || null,
        country:  form.country.trim()  || null,
        note:     form.note.trim()     || null,
      })
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить изменения')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(2px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        width: 480, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 16,
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--crm-border2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)' }}>
            Редактировать клиента
          </span>
          <button
            onClick={() => handleClose(form, onClose)}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--crm-s3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--crm-muted)', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--crm-red-dim)'
              e.currentTarget.style.color = 'var(--crm-red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--crm-s3)'
              e.currentTarget.style.color = 'var(--crm-muted)'
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <F label="ИМЯ">
            <input type="text" value={form.name} onChange={set('name')} style={fieldStyle} onFocus={fb} onBlur={ub} />
          </F>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="TELEGRAM">
              <input type="text" value={form.telegram} onChange={set('telegram')} placeholder="@username" style={fieldStyle} onFocus={fb} onBlur={ub} />
            </F>
            <F label="DISCORD">
              <input type="text" value={form.discord} onChange={set('discord')} placeholder="username#0000" style={fieldStyle} onFocus={fb} onBlur={ub} />
            </F>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="EMAIL">
              <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" style={fieldStyle} onFocus={fb} onBlur={ub} />
            </F>
            <F label="СТРАНА">
              <input type="text" value={form.country} onChange={set('country')} placeholder="Страна" style={fieldStyle} onFocus={fb} onBlur={ub} />
            </F>
          </div>
          <F label="ЗАМЕТКА">
            <textarea value={form.note} onChange={set('note')} placeholder="Заметка о клиенте..." style={taStyle} onFocus={fb} onBlur={ub} />
          </F>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--crm-red-dim)',
              fontSize: 13, color: 'var(--crm-red)',
            }}>
              <AlertCircle size={14} strokeWidth={2} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '16px 24px', borderTop: '1px solid var(--crm-border2)', flexShrink: 0,
        }}>
          <button
            onClick={() => handleClose(form, onClose)}
            disabled={loading}
            style={{
              height: 36, padding: '0 18px', borderRadius: 8,
              background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
              color: 'var(--crm-muted)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--crm-border2)'
              e.currentTarget.style.color = 'var(--crm-text)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--crm-s3)'
              e.currentTarget.style.color = 'var(--crm-muted)'
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              height: 36, padding: '0 18px', borderRadius: 8,
              background: 'var(--crm-blue)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1' }}
          >
            {loading && <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}
