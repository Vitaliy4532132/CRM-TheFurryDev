'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { createCRMClient } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'

interface CreateClientModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  background: 'var(--crm-s3)',
  border: '1px solid var(--crm-border2)',
  borderRadius: 8,
  color: 'var(--crm-text)',
  fontSize: 13,
  padding: '0 12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const textareaStyle: React.CSSProperties = {
  ...fieldStyle,
  height: 90,
  padding: '10px 12px',
  resize: 'vertical',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--crm-muted)',
  marginBottom: 6,
  display: 'block',
  letterSpacing: '0.04em',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function focusBlue(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)'
}
function unfocus(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)'
}

const EMPTY = { name: '', telegram: '', discord: '', email: '', country: '', note: '' }

export function CreateClientModal({ open, onClose, onSuccess }: CreateClientModalProps) {
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Сбрасываем форму при открытии
  useEffect(() => {
    if (open) { setForm(EMPTY); setError(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Укажите имя клиента'); return }
    setLoading(true)
    setError(null)
    try {
      await createCRMClient({
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
      setError(e instanceof Error ? e.message : 'Не удалось создать клиента')
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
      <div
        style={{
          width: 480, maxHeight: '90vh', overflowY: 'auto',
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--crm-border2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)' }}>
            Добавить клиента
          </span>
          <button
            onClick={() => handleClose(form, onClose)}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--crm-s3)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--crm-muted)', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--crm-red-dim)'
              e.currentTarget.style.color = 'var(--crm-red)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--crm-s3)'
              e.currentTarget.style.color = 'var(--crm-muted)'
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Field label="ИМЯ">
            <input
              type="text"
              placeholder="Имя клиента"
              value={form.name}
              onChange={set('name')}
              style={fieldStyle}
              onFocus={focusBlue}
              onBlur={unfocus}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="TELEGRAM">
              <input
                type="text"
                placeholder="@username"
                value={form.telegram}
                onChange={set('telegram')}
                style={fieldStyle}
                onFocus={focusBlue}
                onBlur={unfocus}
              />
            </Field>
            <Field label="DISCORD">
              <input
                type="text"
                placeholder="username#0000"
                value={form.discord}
                onChange={set('discord')}
                style={fieldStyle}
                onFocus={focusBlue}
                onBlur={unfocus}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="EMAIL">
              <input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={set('email')}
                style={fieldStyle}
                onFocus={focusBlue}
                onBlur={unfocus}
              />
            </Field>
            <Field label="СТРАНА">
              <input
                type="text"
                placeholder="Страна"
                value={form.country}
                onChange={set('country')}
                style={fieldStyle}
                onFocus={focusBlue}
                onBlur={unfocus}
              />
            </Field>
          </div>

          <Field label="ЗАМЕТКА">
            <textarea
              placeholder="Заметка о клиенте..."
              value={form.note}
              onChange={set('note')}
              style={textareaStyle}
              onFocus={focusBlue}
              onBlur={unfocus}
            />
          </Field>

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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--crm-border2)'
              e.currentTarget.style.color = 'var(--crm-text)'
            }}
            onMouseLeave={(e) => {
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
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = '1' }}
          >
            {loading && <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading ? 'Добавляем...' : 'Добавить'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}
