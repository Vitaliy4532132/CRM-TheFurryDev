'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'

// ── Стилизованная замена window.confirm для опасных действий ─────────────────

interface ConfirmDialogProps {
  open:        boolean
  title:       string
  description?: string
  confirmLabel?: string
  onConfirm:   () => void | Promise<void>
  onCancel:    () => void
}

export function ConfirmDialog({
  open, title, description = 'Это действие нельзя отменить.',
  confirmLabel = 'Удалить', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleConfirm() {
    setBusy(true)
    try { await onConfirm() }
    finally { setBusy(false) }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, backdropFilter: 'blur(2px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        width: 380,
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 12,
        padding: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--crm-red-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trash2 size={22} color="var(--crm-red)" strokeWidth={2}/>
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--crm-text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--crm-muted)', lineHeight: 1.5 }}>{description}</div>

        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, height: 38, borderRadius: 8,
              background: 'var(--crm-s3)',
              border: '1px solid var(--crm-border2)',
              color: 'var(--crm-muted)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-border2)'; e.currentTarget.style.color = 'var(--crm-text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--crm-s3)';    e.currentTarget.style.color = 'var(--crm-muted)' }}
          >
            Отмена
          </button>

          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              flex: 1, height: 38, borderRadius: 8,
              background: 'var(--crm-red-dim)',
              border: '1px solid var(--crm-red)',
              color: 'var(--crm-red)', fontSize: 13, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'opacity 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { if (!busy) e.currentTarget.style.opacity = '1' }}
          >
            {busy && <Loader2 size={14} strokeWidth={2} style={{ animation: 'crm-confirm-spin 0.8s linear infinite' }}/>}
            {confirmLabel}
          </button>
        </div>
        <style>{`@keyframes crm-confirm-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
