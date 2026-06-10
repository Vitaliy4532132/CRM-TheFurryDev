'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Trash2,
  Send, MessageSquare, Mail, ExternalLink,
  RefreshCw, Plus, CheckCircle, CreditCard,
} from 'lucide-react'
import { getOrders, getPayments, getClients, getServices, updateCRMOrder, deleteCRMOrder } from '@/lib/crm/api'
import { CreatePaymentModal } from '@/components/crm/modals/create-payment-modal'
import { ChangeStatusModal } from '@/components/crm/modals/change-status-modal'
import { EditOrderModal } from '@/components/crm/modals/edit-order-modal'
import { ConfirmDialog } from '@/components/crm/confirm-dialog'
import { OrderStatusBadge, PaymentMethodBadge } from '@/components/crm/status-badge'
import { toast } from '@/components/crm/toast'
import { formatMoney, formatDate, getDeadlineColor } from '@/lib/crm/helpers'
import type { CRMOrder, CRMPayment, CRMClient, CRMService } from '@/types/crm'
import { SensitiveValue } from '@/components/crm/sensitive-value'

// ── Helpers ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = { background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:20 }

function BlockTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:11,fontWeight:600,color:'var(--crm-muted)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid var(--crm-border)',paddingBottom:10,marginBottom:16 }}>{children}</div>
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
      <span style={{ fontSize:11,color:'var(--crm-muted)',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' }}>{label}</span>
      <span style={{ fontSize:13,color:'var(--crm-text)',fontWeight:500 }}>{children}</span>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, variant, onClick, disabled }: {
  icon: typeof Plus; label: string
  variant: 'ghost'|'blue'|'green'|'red-outline'
  onClick?: () => void; disabled?: boolean
}) {
  const variants: Record<string, React.CSSProperties> = {
    ghost:       { background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)' },
    blue:        { background:'var(--crm-blue)',border:'none',color:'#fff' },
    green:       { background:'var(--crm-green)',border:'none',color:'#fff' },
    'red-outline': { background:'transparent',border:'1px solid var(--crm-red)',color:'var(--crm-red)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ display:'flex',alignItems:'center',gap:7,height:36,padding:'0 14px',borderRadius:8,fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,whiteSpace:'nowrap',transition:'opacity 0.15s',...variants[variant] }}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity='0.8'}}
      onMouseLeave={e=>{if(!disabled)e.currentTarget.style.opacity='1'}}>
      <Icon size={14} strokeWidth={2}/>{label}
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w, h = 14 }: { w: number|string; h?: number }) {
  return <div style={{ width:w,height:h,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
}

function PageSkeleton() {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <Skel w={140} h={18}/><div style={{ display:'flex',gap:8 }}><Skel w={120} h={34}/><Skel w={90} h={34}/></div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 280px',gap:16 }}>
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {[0,1,2].map(i=><div key={i} style={{ ...card,display:'flex',flexDirection:'column',gap:12 }}><Skel w={200} h={18}/><Skel w="100%" h={60}/></div>)}
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {[0,1].map(i=><div key={i} style={{ ...card,display:'flex',flexDirection:'column',gap:12 }}><Skel w={80} h={12}/><Skel w="100%" h={80}/></div>)}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = { padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:'0.06em',color:'var(--crm-muted)',textTransform:'uppercase',borderBottom:'1px solid var(--crm-border2)',whiteSpace:'nowrap' }

export default function OrderCardPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [order,        setOrder]        = useState<CRMOrder | null>(null)
  const [payments,     setPayments]     = useState<CRMPayment[]>([])
  const [clients,      setClients]      = useState<CRMClient[]>([])
  const [services,     setServices]     = useState<CRMService[]>([])
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [loadError,    setLoadError]    = useState(false)
  const [statusModal,  setStatusModal]  = useState(false)
  const [paymentModal, setPaymentModal] = useState(false)
  const [editModal,    setEditModal]    = useState(false)
  const [completing,   setCompleting]   = useState(false)
  const [deleteOpen,   setDeleteOpen]   = useState(false)

  const loadOrder = useCallback(async () => {
    try {
      const [allOrders, allPayments, c, s] = await Promise.all([
        getOrders(),
        getPayments(),
        getClients(),
        getServices(),
      ])
      const o = allOrders.find(ord => ord.id === id)
      if (!o) { setNotFound(true); return }
      const p = allPayments.filter(pmt => pmt.order_id === id)
      setOrder(o); setPayments(p); setClients(c); setServices(s)
      setLoadError(false)
    } catch { setLoadError(true) } // сетевая ошибка ≠ 404
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadOrder() }, [loadOrder])

  async function confirmDelete() {
    if (!order) return
    try {
      await deleteCRMOrder(order.id)
      toast.success(`Заказ #${order.order_number} удалён`)
      router.push('/orders')
    } catch {
      toast.error('Не удалось удалить заказ')
      setDeleteOpen(false)
    }
  }

  async function handleComplete() {
    if (!order) return
    setCompleting(true)
    try {
      const updated = await updateCRMOrder(order.id, { status: 'completed' })
      // updateCRMOrder возвращает строку без join'ов — сохраняем client/service
      setOrder({ ...updated, client: order.client, service: order.service })
      toast.success('Заказ отмечен завершённым')
    } catch {
      toast.error('Не удалось обновить статус')
    } finally { setCompleting(false) }
  }

  async function handlePaymentCreated(_amount: number) {
    if (!order) return
    // createCRMPayment инвалидировал кеш — загружаем свежие данные
    try {
      const [allOrders, allPayments] = await Promise.all([
        getOrders(),
        getPayments(),
      ])
      const updatedOrder    = allOrders.find(o => o.id === id)
      const updatedPayments = allPayments.filter(p => p.order_id === id)
      if (updatedOrder) setOrder(updatedOrder)
      setPayments(updatedPayments)
    } catch {
      toast.error('Платёж создан, но не удалось обновить данные — обновите страницу')
    }
  }

  const refreshClients = useCallback(async () => { const c = await getClients(); setClients(c) }, [])

  // ── Not found / error ──────────────────────────────────────────────────────

  if (!loading && notFound) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'60px 0' }}>
        <div style={{ fontSize:48,fontWeight:700,color:'var(--crm-muted)' }}>404</div>
        <div style={{ fontSize:16,color:'var(--crm-text)' }}>Заказ не найден</div>
        <Link href="/orders" style={{ fontSize:13,color:'var(--crm-blue)',textDecoration:'none',fontWeight:500 }}>← Назад к заказам</Link>
      </div>
    )
  }

  if (!loading && loadError) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'60px 0' }}>
        <div style={{ fontSize:16,color:'var(--crm-text)' }}>Не удалось загрузить заказ</div>
        <button onClick={() => { setLoading(true); loadOrder() }} style={{ height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>
          Повторить
        </button>
        <Link href="/orders" style={{ fontSize:13,color:'var(--crm-blue)',textDecoration:'none',fontWeight:500 }}>← Назад к заказам</Link>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <PageSkeleton/>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  if (!order) return null

  const pct      = order.amount > 0 ? Math.min(Math.round((order.paid / order.amount) * 100), 100) : 0
  const rest     = order.amount - order.paid
  const barColor = pct >= 100 ? 'var(--crm-green)' : pct > 0 ? 'var(--crm-orange)' : 'var(--crm-red)'
  const client   = order.client

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <Link href="/orders" style={{ display:'inline-flex',alignItems:'center',gap:7,fontSize:13,color:'var(--crm-muted)',textDecoration:'none',fontWeight:500,transition:'color 0.15s' }} className="crm-back-link">
          <ArrowLeft size={15} strokeWidth={2}/>Назад к заказам
        </Link>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={() => setEditModal(true)} style={{ display:'flex',alignItems:'center',gap:6,height:34,padding:'0 14px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <Pencil size={13} strokeWidth={1.75}/>Редактировать
          </button>
          <button onClick={() => setDeleteOpen(true)} style={{ display:'flex',alignItems:'center',gap:6,height:34,padding:'0 14px',borderRadius:8,background:'transparent',border:'1px solid var(--crm-red)',color:'var(--crm-red)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
            <Trash2 size={13} strokeWidth={1.75}/>Удалить
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 280px',gap:16,alignItems:'start' }}>

        {/* ── LEFT ── */}
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

          {/* Order info */}
          <div style={card}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
              <h1 style={{ fontSize:17,fontWeight:700,color:'var(--crm-text)',margin:0,lineHeight:1.2 }}>
                {order.order_number > 0
                  ? `Заказ #${order.order_number} — ${order.project_name}`
                  : `Заказ — ${order.project_name}`
                }
              </h1>
              <OrderStatusBadge status={order.status}/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
              <InfoRow label="Услуга">{order.service?.name ?? '—'}</InfoRow>
              <InfoRow label="Дедлайн">
                <span style={{ color:getDeadlineColor(order.deadline),fontWeight:600 }}>
                  {order.deadline ? formatDate(order.deadline) : '—'}
                </span>
              </InfoRow>
              <InfoRow label="Дата создания">{formatDate(order.created_at)}</InfoRow>
              <InfoRow label="Дата обновления">{formatDate(order.updated_at)}</InfoRow>
            </div>
          </div>

          {/* Description */}
          {order.description && (
            <div style={card}>
              <BlockTitle>Описание</BlockTitle>
              <p style={{ fontSize:13,color:'var(--crm-muted)',lineHeight:1.7,margin:0 }}>{order.description}</p>
            </div>
          )}

          {/* Comment */}
          {order.comment && (
            <div style={card}>
              <BlockTitle>Комментарий</BlockTitle>
              <p style={{ fontSize:13,color:'var(--crm-muted)',lineHeight:1.7,margin:0 }}>{order.comment}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

          {/* Client */}
          <div style={card}>
            <BlockTitle>Клиент</BlockTitle>
            {client ? (
              <>
                <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
                  <div style={{ width:48,height:48,borderRadius:'50%',background:'var(--crm-blue-dim)',color:'var(--crm-blue)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,flexShrink:0 }}>
                    {client.name[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize:14,fontWeight:700,color:'var(--crm-text)' }}>{client.name}</span>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:14 }}>
                  {client.telegram && (
                    <a href={`https://t.me/${client.telegram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:7,fontSize:13,color:'var(--crm-blue)',textDecoration:'none' }}>
                      <Send size={13} strokeWidth={1.75}/>{client.telegram}
                    </a>
                  )}
                  {client.discord && (
                    <span style={{ display:'inline-flex',alignItems:'center',gap:7,fontSize:13,color:'var(--crm-purple)' }}>
                      <MessageSquare size={13} strokeWidth={1.75}/>{client.discord}
                    </span>
                  )}
                  {client.email && (
                    <span style={{ display:'inline-flex',alignItems:'center',gap:7,fontSize:13,color:'var(--crm-muted)' }}>
                      <Mail size={13} strokeWidth={1.75}/>{client.email}
                    </span>
                  )}
                </div>
                <Link href={`/clients/${client.id}`} style={{ display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 12px',borderRadius:7,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:12,fontWeight:500,textDecoration:'none',transition:'background 0.15s,color 0.15s' }} className="crm-open-client-btn">
                  <ExternalLink size={12} strokeWidth={1.75}/>Открыть карточку клиента
                </Link>
              </>
            ) : (
              <span style={{ fontSize:13,color:'var(--crm-muted)' }}>Клиент не указан</span>
            )}
          </div>

          {/* Finance */}
          <div style={card}>
            <BlockTitle>Финансы заказа</BlockTitle>
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:16 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:13,color:'var(--crm-muted)' }}>Сумма заказа</span>
                <SensitiveValue><span style={{ fontSize:13,fontWeight:700,color:'var(--crm-text)' }}>{formatMoney(order.amount)}</span></SensitiveValue>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:13,color:'var(--crm-muted)' }}>Оплачено</span>
                <SensitiveValue><span style={{ fontSize:13,fontWeight:700,color: pct>=100?'var(--crm-green)':pct>0?'var(--crm-orange)':'var(--crm-red)' }}>{formatMoney(order.paid)}</span></SensitiveValue>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:13,color:'var(--crm-muted)' }}>Остаток</span>
                <SensitiveValue><span style={{ fontSize:13,fontWeight:700,color:rest===0?'var(--crm-muted)':'var(--crm-red)' }}>{rest===0?'—':formatMoney(rest)}</span></SensitiveValue>
              </div>
            </div>
            <div style={{ height:1,background:'var(--crm-border)',marginBottom:14 }}/>
            <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
              <div style={{ display:'flex',justifyContent:'space-between' }}>
                <span style={{ fontSize:11,color:'var(--crm-muted)' }}>Прогресс оплаты</span>
                <SensitiveValue><span style={{ fontSize:11,fontWeight:600,color:barColor }}>{pct}%</span></SensitiveValue>
              </div>
              <div style={{ width:'100%',height:6,borderRadius:4,background:'var(--crm-s3)',overflow:'hidden' }}>
                <div style={{ height:'100%',width:`${pct}%`,borderRadius:4,background:barColor,transition:'width 0.4s ease' }}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment history ── */}
      <div style={card}>
        <BlockTitle>История платежей</BlockTitle>
        {payments.length > 0 ? (
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>№</th>
                <th style={thStyle}>Сумма</th>
                <th style={thStyle}>Способ</th>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < payments.length-1 ? '1px solid var(--crm-border)' : 'none' }}>
                  <td style={{ padding:'11px 12px',fontSize:13,color:'var(--crm-muted)',fontWeight:600 }}>{i+1}</td>
                  <td style={{ padding:'11px 12px',fontSize:13,fontWeight:700,color:'var(--crm-green)',whiteSpace:'nowrap' }}><SensitiveValue>+{formatMoney(p.amount)}</SensitiveValue></td>
                  <td style={{ padding:'11px 12px' }}><PaymentMethodBadge method={p.payment_method}/></td>
                  <td style={{ padding:'11px 12px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>{formatDate(p.payment_date)}</td>
                  <td style={{ padding:'11px 12px',fontSize:13,color:'var(--crm-muted)' }}>{p.comment ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:'32px 0',color:'var(--crm-muted)' }}>
            <CreditCard size={40} strokeWidth={1.25}/>
            <span style={{ fontSize:14 }}>Платежей ещё нет</span>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
        <ActionBtn icon={RefreshCw}   label="Изменить статус"     variant="ghost" onClick={() => setStatusModal(true)}/>
        <ActionBtn icon={Plus}        label="Добавить платёж"      variant="blue"  onClick={() => setPaymentModal(true)}/>
        <ActionBtn icon={CheckCircle} label="Отметить завершённым" variant="green" onClick={handleComplete} disabled={completing || order.status === 'completed'}/>
      </div>

      {/* ── Modals ── */}
      <ChangeStatusModal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        onSuccess={() => { setStatusModal(false); loadOrder() }}
        orderId={order.id}
        currentStatus={order.status}
      />
      <CreatePaymentModal
        open={paymentModal}
        onClose={() => setPaymentModal(false)}
        onSuccess={handlePaymentCreated}
        orderId={order.id}
        clientId={order.client_id}
        orderLabel={`#${order.order_number}`}
        clientLabel={order.client?.name ?? ''}
      />
      <EditOrderModal
        open={editModal}
        onClose={() => setEditModal(false)}
        onSuccess={() => { setEditModal(false); loadOrder() }}
        order={order}
        clients={clients}
        services={services}
        onClientCreated={refreshClients}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={`Удалить заказ #${order.order_number}?`}
        description="Заказ и связь с платежами будут удалены. Это действие нельзя отменить."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <style>{`
        .crm-back-link:hover { color: var(--crm-text) !important; }
        .crm-open-client-btn:hover { background: var(--crm-border2) !important; color: var(--crm-text) !important; }
        @keyframes crm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
