'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import Link from 'next/link'
import type { CRMPayment, CRMOrder } from '@/types/crm'
import { formatMoney, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/crm/helpers'
import { SensitiveValue } from '@/components/crm/sensitive-value'

interface ViewPaymentModalProps {
  payment: CRMPayment | null
  onClose: () => void
}

function CommentDisplay({ comment }: { comment: string | null }) {
  if (!comment) return <span style={{ color: 'var(--crm-muted)' }}>—</span>
  const idx = comment.indexOf(' | ')
  if (idx !== -1) {
    const note = comment.substring(0, idx)
    const text = comment.substring(idx + 3)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--crm-muted)' }}>{note}</span>
        <span style={{ fontSize: 13, color: 'var(--crm-muted)' }}>{text}</span>
      </div>
    )
  }
  return <span style={{ color: 'var(--crm-muted)' }}>{comment}</span>
}

const thStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--crm-muted)',
  letterSpacing: '0.05em', textTransform: 'uppercase',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={thStyle}>{label}</span>
      <div style={{ fontSize: 13, color: 'var(--crm-text)' }}>{children}</div>
    </div>
  )
}

export function ViewPaymentModal({ payment, onClose }: ViewPaymentModalProps) {
  useEffect(() => {
    if (!payment) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [payment, onClose])

  if (!payment) return null

  const methodLabel = payment.payment_method
    ? (PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method)
    : '—'

  type PartialOrder = { id?: string; order_number?: number; project_name?: string }
  const order = payment.order as (CRMOrder & PartialOrder) | undefined

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ width: 460, background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--crm-border2)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)' }}>Просмотр платежа</span>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--crm-s3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crm-muted)', transition: 'background 0.15s,color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-red-dim)'; e.currentTarget.style.color = 'var(--crm-red)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--crm-s3)'; e.currentTarget.style.color = 'var(--crm-muted)' }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Amount */}
          <div style={{ padding: '14px 16px', background: 'var(--crm-s3)', borderRadius: 10, border: '1px solid var(--crm-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Сумма</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--crm-green)', letterSpacing: '-0.02em' }}>
              <SensitiveValue>+{formatMoney(payment.amount)}</SensitiveValue>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Row label="Дата">{formatDate(payment.payment_date)}</Row>
            <Row label="Способ оплаты">{methodLabel}</Row>
            <Row label="Клиент">
              {payment.client?.name ?? <span style={{ color: 'var(--crm-muted)' }}>Без клиента</span>}
            </Row>
            <Row label="Заказ">
              {order && payment.order_id ? (
                <Link href={`/orders/${payment.order_id}`} onClick={onClose} style={{ color: 'var(--crm-blue)', textDecoration: 'none', fontWeight: 600 }}>
                  #{order.order_number} — {order.project_name}
                </Link>
              ) : <span style={{ color: 'var(--crm-muted)' }}>Без заказа</span>}
            </Row>
          </div>

          {/* Comment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={thStyle}>Комментарий</span>
            <CommentDisplay comment={payment.comment} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid var(--crm-border2)' }}>
          <button
            onClick={onClose}
            style={{ height: 36, padding: '0 18px', borderRadius: 8, background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)', color: 'var(--crm-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s,color 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-border2)'; e.currentTarget.style.color = 'var(--crm-text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--crm-s3)'; e.currentTarget.style.color = 'var(--crm-muted)' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
