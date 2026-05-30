'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Send, Mail, MapPin, Calendar,
  MessageSquare, ClipboardList,
} from 'lucide-react'
import { getClientById, getOrdersByClient } from '@/lib/crm/api'
import { ORDER_STATUS_LABELS } from '@/types/crm'
import type { CRMClient, CRMOrder } from '@/types/crm'

// ── Status badge для английских статусов CRM ─────────────────────────────────

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:             { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  discussion:      { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  waiting_payment: { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  in_progress:     { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  review:          { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  revision:        { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  done:            { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
  completed:       { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  cancelled:       { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
}

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? { color: 'var(--crm-muted)', bg: 'rgba(100,116,139,0.12)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      color: cfg.color, background: cfg.bg,
    }}>
      {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div style={{
      width: w, height: h,
      background: 'var(--crm-s3)', borderRadius: 6,
      animation: 'crm-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Skel w={140} h={18} />
      <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Skel w={64} h={64} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel w={160} h={20} />
            <Skel w={100} h={13} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[110, 130, 130, 90, 100].map((w, i) => <Skel key={i} w={w} h={34} />)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '18px 20px' }}>
            <Skel w={100} h={12} />
            <div style={{ marginTop: 8 }}><Skel w={80} h={28} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ContactChip ───────────────────────────────────────────────────────────────

function ContactChip({
  icon: Icon, text, color, href,
}: {
  icon: typeof Send
  text: string
  color: string
  href?: string
}) {
  const inner = (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
      fontSize: 13, color, textDecoration: 'none',
    }}>
      <Icon size={14} strokeWidth={1.75} />
      {text}
    </div>
  )
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
  return <>{inner}</>
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

function money(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽'
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'var(--crm-muted)', textTransform: 'uppercase',
  borderBottom: '1px solid var(--crm-border2)', whiteSpace: 'nowrap',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientCardPage() {
  const { id } = useParams<{ id: string }>()
  const [client,  setClient]  = useState<CRMClient | null>(null)
  const [orders,  setOrders]  = useState<CRMOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [c, o] = await Promise.all([
          getClientById(id),
          getOrdersByClient(id),
        ])
        setClient(c)
        setOrders(o)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Статистика ──────────────────────────────────────────────────────────────

  const totalOrders  = orders.length
  const totalAmount  = orders.reduce((s, o) => s + o.amount, 0)
  const totalUnpaid  = orders.reduce((s, o) => s + Math.max(0, o.amount - o.paid), 0)

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!loading && notFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--crm-muted)' }}>404</div>
        <div style={{ fontSize: 16, color: 'var(--crm-text)' }}>Клиент не найден</div>
        <Link
          href="/clients"
          style={{ fontSize: 13, color: 'var(--crm-blue)', textDecoration: 'none', fontWeight: 500 }}
        >
          ← Назад к клиентам
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Back ── */}
      <div>
        <Link
          href="/clients"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 13, color: 'var(--crm-muted)',
            textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s',
          }}
          className="crm-back-link"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Назад к клиентам
        </Link>
      </div>

      {/* ── Skeleton ── */}
      {loading && <PageSkeleton />}

      {/* ── Content ── */}
      {!loading && client && (
        <>
          {/* ── Client info block ── */}
          <div style={{
            background: 'var(--crm-surface)',
            border: '1px solid var(--crm-border2)',
            borderRadius: 14, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--crm-blue-dim)', color: 'var(--crm-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, flexShrink: 0,
              }}>
                {client.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--crm-text)', lineHeight: 1.2 }}>
                  {client.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--crm-muted)', marginTop: 4 }}>
                  Клиент с {formatDate(client.created_at)}
                </div>
              </div>
            </div>

            {/* Contacts row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {client.telegram && (
                <ContactChip
                  icon={Send} text={client.telegram} color="var(--crm-blue)"
                  href={`https://t.me/${client.telegram.replace('@', '')}`}
                />
              )}
              {client.discord && (
                <ContactChip icon={MessageSquare} text={client.discord} color="var(--crm-purple)" />
              )}
              {client.email && (
                <ContactChip icon={Mail} text={client.email} color="var(--crm-muted)" href={`mailto:${client.email}`} />
              )}
              {client.country && (
                <ContactChip icon={MapPin} text={client.country} color="var(--crm-muted)" />
              )}
              <ContactChip icon={Calendar} text={formatDate(client.created_at)} color="var(--crm-muted)" />
            </div>

            {/* Note */}
            {client.note && (
              <div style={{
                padding: '14px 16px',
                background: 'var(--crm-s3)', border: '1px solid var(--crm-border)',
                borderRadius: 10, fontSize: 13, color: 'var(--crm-muted)', lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--crm-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Заметка
                </div>
                {client.note}
              </div>
            )}
          </div>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Всего заказов', value: String(totalOrders), color: 'var(--crm-blue)' },
              { label: 'Общая сумма',   value: money(totalAmount),  color: 'var(--crm-green)' },
              { label: 'Неоплачено',    value: money(totalUnpaid),  color: 'var(--crm-red)' },
            ].map((s) => (
              <div key={s.label} style={{
                background: 'var(--crm-surface)',
                border: '1px solid var(--crm-border2)',
                borderRadius: 12, padding: '18px 20px',
              }}>
                <div style={{ fontSize: 12, color: 'var(--crm-muted)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Orders table ── */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)', margin: '0 0 12px 0' }}>
              Заказы клиента
            </h2>

            {orders.length === 0 ? (
              <div style={{
                background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)',
                borderRadius: 12, padding: '48px 24px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <ClipboardList size={40} color="var(--crm-muted)" strokeWidth={1.25} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text)' }}>Заказов пока нет</div>
                <div style={{ fontSize: 13, color: 'var(--crm-muted)' }}>Создайте первый заказ для этого клиента</div>
              </div>
            ) : (
              <div style={{
                background: 'var(--crm-surface)',
                border: '1px solid var(--crm-border2)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--crm-s3)' }}>
                    <tr>
                      <th style={thStyle}>№</th>
                      <th style={thStyle}>Услуга</th>
                      <th style={thStyle}>Проект</th>
                      <th style={thStyle}>Сумма</th>
                      <th style={thStyle}>Статус</th>
                      <th style={thStyle}>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => (
                      <tr
                        key={order.id}
                        style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--crm-border)' : 'none' }}
                      >
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <Link
                            href={`/orders/${order.id}`}
                            style={{ color: 'var(--crm-muted)', textDecoration: 'none' }}
                            className="crm-order-link"
                          >
                            #{order.order_number}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-blue)', whiteSpace: 'nowrap' }}>
                          {order.service?.name ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-text)', whiteSpace: 'nowrap' }}>
                          {order.project_name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: 'var(--crm-text)', whiteSpace: 'nowrap' }}>
                          {money(order.amount)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <StatusChip status={order.status} />
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .crm-back-link:hover  { color: var(--crm-text) !important; }
        .crm-order-link:hover { color: var(--crm-blue) !important; }
        @keyframes crm-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
