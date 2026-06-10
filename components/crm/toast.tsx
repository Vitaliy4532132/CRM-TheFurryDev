'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

// ── Мини-система тостов ───────────────────────────────────────────────────────
// toast.success('...') / toast.error('...') из любого места CRM.
// <Toaster/> монтируется один раз в CRMClientProviders.

type ToastKind = 'success' | 'error'

interface ToastItem {
  id:      number
  kind:    ToastKind
  message: string
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
let listener: Listener | null = null
let nextId = 1

function push(kind: ToastKind, message: string) {
  const item: ToastItem = { id: nextId++, kind, message }
  toasts = [...toasts, item]
  listener?.(toasts)
  setTimeout(() => dismiss(item.id), 4000)
}

function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  listener?.(toasts)
}

export const toast = {
  success: (message: string) => push('success', message),
  error:   (message: string) => push('error', message),
}

// ── Рендер ────────────────────────────────────────────────────────────────────

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listener = setItems
    return () => { listener = null }
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {items.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          minWidth: 240, maxWidth: 360, padding: '12px 14px',
          background: 'var(--crm-surface)',
          border: `1px solid ${t.kind === 'success' ? 'var(--crm-green)' : 'var(--crm-red)'}`,
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          animation: 'crm-toast-in 0.2s ease',
        }}>
          {t.kind === 'success'
            ? <CheckCircle size={16} color="var(--crm-green)" strokeWidth={2} style={{ flexShrink: 0 }}/>
            : <AlertCircle size={16} color="var(--crm-red)"   strokeWidth={2} style={{ flexShrink: 0 }}/>
          }
          <span style={{ flex: 1, fontSize: 13, color: 'var(--crm-text)', lineHeight: 1.4 }}>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--crm-muted)',
            }}
          >
            <X size={13} strokeWidth={2}/>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes crm-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
