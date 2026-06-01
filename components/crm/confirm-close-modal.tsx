'use client'

import { AlertTriangle } from 'lucide-react'

interface ConfirmCloseModalProps {
  isOpen:    boolean
  onConfirm: () => void
  onCancel:  () => void
}

export function ConfirmCloseModal({ isOpen, onConfirm, onCancel }: ConfirmCloseModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        width: 360,
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 12,
        padding: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--crm-yellow-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={24} color="var(--crm-yellow)" strokeWidth={2}/>
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--crm-text)' }}>
          Закрыть без сохранения?
        </div>

        <div style={{ fontSize: 13, color: 'var(--crm-muted)', lineHeight: 1.5 }}>
          Все введённые данные будут потеряны.
        </div>

        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
          <button
            onClick={onCancel}
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
            Остаться
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex: 1, height: 38, borderRadius: 8,
              background: 'var(--crm-red-dim)',
              border: '1px solid var(--crm-red)',
              color: 'var(--crm-red)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
