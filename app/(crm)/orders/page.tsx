'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Pencil, Trash2, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { getOrders, getClients, getServices, deleteCRMOrder } from '@/lib/crm/api'
import { CreateOrderModal } from '@/components/crm/modals/create-order-modal'
import { EditOrderModal } from '@/components/crm/modals/edit-order-modal'
import { OrdersFilters } from '@/components/crm/filters/orders-filters'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  formatMoney, formatDate, getDeadlineColor, getPaymentStatus,
} from '@/lib/crm/helpers'
import type { CRMOrder, CRMClient, CRMService } from '@/types/crm'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w }: { w: number | string }) {
  return <div style={{ height: 13, width: w, background: 'var(--crm-s3)', borderRadius: 6, animation: 'crm-pulse 1.5s ease-in-out infinite' }} />
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--crm-border)' }}>
      {[50, 90, 90, 110, 70, 90, 70, 60, 70, 70].map((w, i) => (
        <td key={i} style={{ padding: '12px 14px' }}><Skel w={w} /></td>
      ))}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--crm-s3)', animation: 'crm-pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      </td>
    </tr>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = ORDER_STATUS_COLORS[status] ?? { color: 'var(--crm-muted)', bg: 'rgba(100,116,139,0.12)' }
  return (
    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:cfg.color,background:cfg.bg }}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({ icon: Icon, danger, title, href, onClick }: {
  icon: typeof Eye; danger?: boolean; title: string; href?: string; onClick?: () => void
}) {
  const style: React.CSSProperties = { width:28,height:28,borderRadius:6,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s',flexShrink:0,textDecoration:'none' }
  const enter = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = danger ? 'var(--crm-red-dim)' : 'var(--crm-border2)'; e.currentTarget.style.color = danger ? 'var(--crm-red)' : 'var(--crm-text)' }
  const leave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'var(--crm-s3)'; e.currentTarget.style.color = 'var(--crm-muted)' }
  if (href) return <Link href={href} title={title} style={style} onMouseEnter={enter} onMouseLeave={leave}><Icon size={13} strokeWidth={1.75}/></Link>
  return <button title={title} onClick={onClick} style={style} onMouseEnter={enter} onMouseLeave={leave}><Icon size={13} strokeWidth={1.75}/></button>
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function isToday(iso: string) {
  const d = new Date(iso)
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function isThisWeek(iso: string) { return Date.now() - new Date(iso).getTime() <= 7 * 86400_000 }
function isThisMonth(iso: string) {
  const d = new Date(iso); const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth()
}
function isLastMonth(iso: string) {
  const d = new Date(iso); const t = new Date()
  const lm = new Date(t.getFullYear(), t.getMonth() - 1, 1)
  return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = { padding:'11px 14px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:'0.06em',color:'var(--crm-muted)',textTransform:'uppercase',borderBottom:'1px solid var(--crm-border2)',whiteSpace:'nowrap' }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders,        setOrders]        = useState<CRMOrder[]>([])
  const [clients,       setClients]       = useState<CRMClient[]>([])
  const [services,      setServices]      = useState<CRMService[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingOrder,  setEditingOrder]  = useState<CRMOrder | null>(null)
  const [search,        setSearch]        = useState('')
  const [statusOrder,   setStatusOrder]   = useState('')
  const [statusPayment, setStatusPayment] = useState('')
  const [dateRange,     setDateRange]     = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [o, c, s] = await Promise.all([getOrders(), getClients(), getServices()])
      setOrders(o); setClients(c); setServices(s)
    } catch { setError('Не удалось загрузить заказы') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Refresh clients only ───────────────────────────────────────────────────
  const refreshClients = useCallback(async () => {
    const c = await getClients()
    setClients(c)
  }, [])

  // ── Приоритет статусов ─────────────────────────────────────────────────────

  const STATUS_PRIORITY: Record<string, number> = {
    in_progress:     0,
    review:          1,
    revision:        2,
    discussion:      3,
    waiting_payment: 4,
    new:             5,
    done:            6,
    completed:       7,
    cancelled:       8,
  }

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const filtered = orders.filter(o => {
    // Поиск
    if (search) {
      const q = search.toLowerCase()
      const matches =
        o.project_name.toLowerCase().includes(q) ||
        (o.client?.name ?? '').toLowerCase().includes(q) ||
        String(o.order_number).includes(q)
      if (!matches) return false
    }
    // Статус (фильтр использует русские строки из OrdersFilters)
    if (statusOrder) {
      const dbVal = Object.entries(ORDER_STATUS_LABELS).find(([, v]) => v === statusOrder)?.[0]
      if (dbVal && o.status !== dbVal) return false
    }
    // Оплата
    if (statusPayment === 'Оплачен' && !(o.paid >= o.amount && o.amount > 0)) return false
    if (statusPayment === 'Частично' && !(o.paid > 0 && o.paid < o.amount)) return false
    if (statusPayment === 'Не оплачен' && o.paid !== 0) return false
    // Дата
    if (dateRange === 'today'      && !isToday(o.created_at))     return false
    if (dateRange === 'week'       && !isThisWeek(o.created_at))  return false
    if (dateRange === 'month'      && !isThisMonth(o.created_at)) return false
    if (dateRange === 'last_month' && !isLastMonth(o.created_at)) return false
    return true
  })

  // ── Сортировка: активные → новые → остальные, внутри группы — новые сверху ─

  const sortedOrders = [...filtered].sort((a, b) => {
    const priorityDiff = (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9)
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // ── Удаление ───────────────────────────────────────────────────────────────

  async function handleDelete(order: CRMOrder) {
    if (!window.confirm(`Удалить заказ #${order.order_number}? Это действие нельзя отменить.`)) return
    try {
      await deleteCRMOrder(order.id)
      setOrders(prev => prev.filter(o => o.id !== order.id))
    } catch { alert('Не удалось удалить заказ') }
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end' }}>
        <button onClick={() => setModalOpen(true)} style={{ display:'flex',alignItems:'center',gap:7,height:38,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity 0.15s' }}
          onMouseEnter={e=>{e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
          <Plus size={15} strokeWidth={2.5}/>Создать заказ
        </button>
      </div>

      {/* ── Filters ── */}
      <OrdersFilters
        search={search} onSearch={setSearch}
        statusOrder={statusOrder} onStatusOrder={setStatusOrder}
        statusPayment={statusPayment} onStatusPayment={setStatusPayment}
        dateRange={dateRange} onDateRange={setDateRange}
      />

      {error && (
        <div style={{ padding:'14px 16px',borderRadius:10,background:'var(--crm-red-dim)',color:'var(--crm-red)',fontSize:13 }}>{error}</div>
      )}

      {/* ── Table ── */}
      <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--crm-s3)' }}>
              <tr>
                <th style={thStyle}>№</th>
                <th style={thStyle}>Клиент</th>
                <th style={thStyle}>Услуга</th>
                <th style={thStyle}>Проект</th>
                <th style={thStyle}>Сумма</th>
                <th style={thStyle}>Оплата</th>
                <th style={thStyle}>Остаток</th>
                <th style={thStyle}>Статус</th>
                <th style={thStyle}>Дедлайн</th>
                <th style={thStyle}>Дата</th>
                <th style={{ ...thStyle,textAlign:'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>

              {loading && [0,1,2,3,4,5,6].map(i => <SkeletonRow key={i}/>)}

              {!loading && !error && sortedOrders.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding:'48px 24px',textAlign:'center' }}>
                    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
                      <ClipboardList size={48} color="var(--crm-muted)" strokeWidth={1.25}/>
                      <div style={{ fontSize:15,fontWeight:600,color:'var(--crm-text)' }}>
                        {search || statusOrder || statusPayment || dateRange ? 'Ничего не найдено' : 'Заказов пока нет'}
                      </div>
                      <div style={{ fontSize:13,color:'var(--crm-muted)' }}>
                        {search || statusOrder ? 'Попробуйте изменить фильтры' : 'Создайте первый заказ'}
                      </div>
                      {!search && !statusOrder && !statusPayment && !dateRange && (
                        <button onClick={() => setModalOpen(true)} style={{ marginTop:4,height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
                          <Plus size={14} strokeWidth={2.5}/>Создать заказ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!loading && sortedOrders.map((order, i) => {
                const rest = order.amount - order.paid
                const pay  = getPaymentStatus(order.amount, order.paid)
                const paidColor = order.paid === 0 ? 'var(--crm-red)' : order.paid < order.amount ? 'var(--crm-orange)' : 'var(--crm-green)'

                return (
                  <tr key={order.id} style={{ borderBottom: i < sortedOrders.length-1 ? '1px solid var(--crm-border)' : 'none', cursor:'pointer', transition:'background 0.12s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                      #{order.order_number ?? order.id.slice(0, 6)}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:500,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
                      {order.client?.name ?? '—'}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-blue)',whiteSpace:'nowrap' }}>
                      {order.service?.name ?? '—'}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
                      {order.project_name}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:700,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
                      {formatMoney(order.amount)}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:paidColor,whiteSpace:'nowrap' }}>
                      {pay.label}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:rest===0?'var(--crm-muted)':'var(--crm-red)',whiteSpace:'nowrap' }}>
                      {rest === 0 ? '—' : formatMoney(rest)}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <OrderStatusBadge status={order.status}/>
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:getDeadlineColor(order.deadline),whiteSpace:'nowrap',fontWeight:500 }}>
                      {order.deadline ? formatDate(order.deadline) : '—'}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6 }}>
                        <ActionButton icon={Eye}    title="Просмотр"       href={`/orders/${order.id}`}/>
                        <ActionButton icon={Pencil} title="Редактировать"  onClick={() => setEditingOrder(order)}/>
                        <ActionButton icon={Trash2} title="Удалить" danger onClick={() => handleDelete(order)}/>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderTop:'1px solid var(--crm-border2)' }}>
            <span style={{ fontSize:13,color:'var(--crm-muted)' }}>
              Показано {sortedOrders.length} из {orders.length} заказов
            </span>
          </div>
        )}
      </div>

      <CreateOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadAll}
        clients={clients}
        services={services}
        onClientCreated={refreshClients}
      />
      <EditOrderModal
        open={editingOrder !== null}
        onClose={() => setEditingOrder(null)}
        order={editingOrder}
        onSuccess={() => { setEditingOrder(null); loadAll() }}
        clients={clients}
        services={services}
        onClientCreated={refreshClients}
      />

      <style>{`
        @keyframes crm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
