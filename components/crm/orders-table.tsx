'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/crm/status-badge'
import type { OrderStatus, PaymentStatus } from '@/components/crm/status-badge'
import { EditOrderModal } from '@/components/crm/modals/edit-order-modal'

interface Order {
  id:           string
  order_number: number
  client:       string
  service:      string
  amount:       string
  status:       OrderStatus
  payment:      PaymentStatus
  date:         string
}

interface OrdersTableProps {
  orders: Order[]
}

function ActionButton({
  icon: Icon,
  danger,
  title,
  onClick,
}: {
  icon: typeof Eye
  danger?: boolean
  title: string
  onClick?: () => void
}) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: 'var(--crm-s3)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--crm-muted)',
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'var(--crm-red-dim)'
          : 'var(--crm-border2)'
        e.currentTarget.style.color = danger
          ? 'var(--crm-red)'
          : 'var(--crm-text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--crm-s3)'
        e.currentTarget.style.color = 'var(--crm-muted)'
      }}
    >
      <Icon size={13} strokeWidth={1.75} />
    </button>
  )
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [editOpen, setEditOpen] = useState(false)
  const router = useRouter()

  const thStyle: React.CSSProperties = {
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'var(--crm-muted)',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--crm-border2)',
    whiteSpace: 'nowrap',
  }

  return (
    <>
    <div
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: 'var(--crm-s3)' }}>
          <tr>
            <th style={thStyle}>№</th>
            <th style={thStyle}>Клиент</th>
            <th style={thStyle}>Услуга</th>
            <th style={thStyle}>Сумма</th>
            <th style={thStyle}>Статус</th>
            <th style={thStyle}>Оплата</th>
            <th style={thStyle}>Дата</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => {
            const displayNum = order.order_number > 0 ? `#${order.order_number}` : '#x'
            const numColor   = order.order_number > 0 ? 'var(--crm-muted)' : 'var(--crm-border2)'
            return (
            <tr
              key={order.id}
              style={{
                borderBottom:
                  i < orders.length - 1 ? '1px solid var(--crm-border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onClick={() => router.push('/orders/' + order.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--crm-surface-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <td
                style={{
                  padding: '13px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: numColor,
                  whiteSpace: 'nowrap',
                }}
              >
                <Link
                  href={`/orders/${order.id}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  className="crm-order-id-link"
                >
                  {displayNum}
                </Link>
              </td>
              <td
                style={{
                  padding: '13px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--crm-text)',
                }}
              >
                {order.client}
              </td>
              <td
                style={{
                  padding: '13px 16px',
                  fontSize: 13,
                  color: 'var(--crm-blue)',
                }}
              >
                {order.service}
              </td>
              <td
                style={{
                  padding: '13px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--crm-text)',
                  whiteSpace: 'nowrap',
                }}
              >
                {order.amount}
              </td>
              <td style={{ padding: '13px 16px' }}>
                <StatusBadge status={order.status} />
              </td>
              <td style={{ padding: '13px 16px' }}>
                <StatusBadge status={order.payment} />
              </td>
              <td
                style={{
                  padding: '13px 16px',
                  fontSize: 13,
                  color: 'var(--crm-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {order.date}
              </td>
              <td style={{ padding: '13px 16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 6,
                  }}
                >
                  <Link
                    href={`/orders/${order.id.replace('#', '')}`}
                    title="Просмотр"
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'var(--crm-s3)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--crm-muted)', textDecoration: 'none',
                      flexShrink: 0, transition: 'background 0.15s, color 0.15s',
                    }}
                    className="crm-eye-link"
                  >
                    <Eye size={13} strokeWidth={1.75} />
                  </Link>
                  <ActionButton icon={Pencil} title="Редактировать" onClick={() => setEditOpen(true)} />
                  <ActionButton icon={Trash2} title="Удалить" danger />
                </div>
              </td>
            </tr>
          )})}

        </tbody>
      </table>
    </div>

    <EditOrderModal open={editOpen} onClose={() => setEditOpen(false)} onSuccess={() => setEditOpen(false)} order={null} clients={[]} services={[]} onClientCreated={() => {}} />
    <style>{`
      .crm-order-id-link:hover { color: var(--crm-blue) !important; }
      .crm-eye-link:hover { background: var(--crm-border2) !important; color: var(--crm-text) !important; }
    `}</style>
    </>
  )
}

export type { Order }
