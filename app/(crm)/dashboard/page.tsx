'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClipboardList, Clock, CheckCircle, Sparkles,
  TrendingUp, TrendingDown, BarChart2, AlertTriangle, CalendarClock,
} from 'lucide-react'
import { StatCard } from '@/components/crm/stat-card'
import { getDashboardStats } from '@/lib/crm/api'
import { formatMoney, formatDate, getDeadlineColor, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/crm/helpers'
import type { DashboardStats, CRMOrder } from '@/types/crm'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatSkel() {
  return (
    <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:'18px 20px' }}>
      <div style={{ height:12,width:100,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite',marginBottom:12 }}/>
      <div style={{ height:28,width:80,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = ORDER_STATUS_COLORS[status] ?? { color:'var(--crm-muted)',bg:'rgba(100,116,139,0.12)' }
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:cfg.color,background:cfg.bg }}>{ORDER_STATUS_LABELS[status] ?? status}</span>
}

function SensitiveValue({ children }: { children: React.ReactNode }) {
  return <span className="crm-sensitive">{children}</span>
}

function PaymentChip({ amount, paid }: { amount: number; paid: number }) {
  const label = paid === 0 ? 'Не оплачен' : paid >= amount ? 'Оплачен' : 'Частично'
  const color = paid === 0 ? 'var(--crm-red)' : paid >= amount ? 'var(--crm-green)' : 'var(--crm-orange)'
  const bg    = paid === 0 ? 'var(--crm-red-dim)' : paid >= amount ? 'var(--crm-green-dim)' : 'var(--crm-orange-dim)'
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color,background:bg }}>{label}</span>
}

function OrderRow({ order, isLast }: { order: CRMOrder; isLast: boolean }) {
  const thStyle: React.CSSProperties = { padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:600,letterSpacing:'0.06em',color:'var(--crm-muted)',textTransform:'uppercase',borderBottom:'1px solid var(--crm-border2)',whiteSpace:'nowrap' }
  void thStyle
  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid var(--crm-border)', cursor:'pointer', transition:'background 0.12s' }}
      onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
      <td style={{ padding:'13px 16px',fontSize:13,fontWeight:600,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
        <Link href={`/orders/${order.id}`} style={{ color:'inherit',textDecoration:'none' }} className="crm-order-id-link">
          #{order.order_number}
        </Link>
      </td>
      <td style={{ padding:'13px 16px',fontSize:13,fontWeight:500,color:'var(--crm-text)' }}>
        {order.client?.name ?? '—'}
      </td>
      <td style={{ padding:'13px 16px',fontSize:13,color:'var(--crm-blue)' }}>
        {order.service?.name ?? '—'}
      </td>
      <td style={{ padding:'13px 16px',fontSize:13,fontWeight:700,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
        <SensitiveValue>{formatMoney(order.amount)}</SensitiveValue>
      </td>
      <td style={{ padding:'13px 16px' }}>
        <OrderStatusBadge status={order.status}/>
      </td>
      <td style={{ padding:'13px 16px' }}>
        <SensitiveValue><PaymentChip amount={order.amount} paid={order.paid}/></SensitiveValue>
      </td>
      <td style={{ padding:'13px 16px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
        {formatDate(order.created_at)}
      </td>
      <td style={{ padding:'13px 16px' }}>
        <Link href={`/orders/${order.id}`} title="Просмотр" style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',textDecoration:'none',flexShrink:0,transition:'background 0.15s,color 0.15s' }} className="crm-eye-link">
          <ClipboardList size={13} strokeWidth={1.75}/>
        </Link>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const thStyle: React.CSSProperties = {
    padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:600,
    letterSpacing:'0.06em', color:'var(--crm-muted)', textTransform:'uppercase',
    borderBottom:'1px solid var(--crm-border2)', whiteSpace:'nowrap',
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:24 }}>

      {/* ── Row 1: Order stats ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
        {loading ? [0,1,2,3].map(i=><StatSkel key={i}/>) : (
          <>
            <StatCard label="Всего заказов"  value={stats?.totalOrders ?? 0}     icon={ClipboardList} iconColor="var(--crm-blue)"   iconBg="var(--crm-blue-dim)"   sub="за всё время"    sensitive/>
            <StatCard label="Активные"       value={stats?.activeOrders ?? 0}    icon={Clock}         iconColor="var(--crm-orange)"  iconBg="var(--crm-orange-dim)"  sub="в работе"        sensitive/>
            <StatCard label="Завершённые"    value={stats?.completedOrders ?? 0} icon={CheckCircle}   iconColor="var(--crm-teal)"    iconBg="var(--crm-teal-dim)"    sub="всего"           sensitive/>
            <StatCard label="Новые заказы"   value={stats?.newOrders ?? 0}       icon={Sparkles}      iconColor="var(--crm-purple)"  iconBg="var(--crm-purple-dim)"  sub="ожидают начала"  sensitive/>
          </>
        )}
      </div>

      {/* ── Row 2: Finance stats ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
        {loading ? [0,1,2,3].map(i=><StatSkel key={i}/>) : (
          <>
            <StatCard label="Доход за месяц"     value={formatMoney(stats?.monthIncome  ?? 0)} icon={TrendingUp}    iconColor="var(--crm-green)"  iconBg="var(--crm-green-dim)"  valueColor="var(--crm-green)"  sensitive/>
            <StatCard label="Расходы за месяц"   value={formatMoney(stats?.monthExpense ?? 0)} icon={TrendingDown}  iconColor="var(--crm-red)"    iconBg="var(--crm-red-dim)"    valueColor="var(--crm-red)"    sensitive/>
            <StatCard label="Прибыль за месяц"   value={formatMoney(stats?.monthProfit  ?? 0)} icon={BarChart2}     iconColor="var(--crm-teal)"   iconBg="var(--crm-teal-dim)"   valueColor="var(--crm-teal)"   sensitive/>
            <StatCard label="Неоплачено"         value={formatMoney(stats?.totalDebt    ?? 0)} icon={AlertTriangle} iconColor="var(--crm-yellow)" iconBg="var(--crm-yellow-dim)" valueColor="var(--crm-yellow)" sub="ожидает оплаты" sensitive/>
          </>
        )}
      </div>

      {/* ── Recent orders ── */}
      <div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
          <h2 style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)',margin:0 }}>Последние заказы</h2>
          <Link href="/orders" style={{ fontSize:13,color:'var(--crm-blue)',fontWeight:500,textDecoration:'none' }}>
            Смотреть все →
          </Link>
        </div>

        <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:24,display:'flex',flexDirection:'column',gap:16 }}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{ height:16,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite',opacity:1-i*0.15 }}/>
              ))}
            </div>
          ) : !stats?.recentOrders?.length ? (
            <div style={{ padding:'40px 24px',textAlign:'center',color:'var(--crm-muted)',fontSize:13 }}>Заказов пока нет</div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead style={{ background:'var(--crm-s3)' }}>
                <tr>
                  <th style={thStyle}>№</th>
                  <th style={thStyle}>Клиент</th>
                  <th style={thStyle}>Услуга</th>
                  <th style={thStyle}>Сумма</th>
                  <th style={thStyle}>Статус</th>
                  <th style={thStyle}>Оплата</th>
                  <th style={thStyle}>Дата</th>
                  <th style={{ ...thStyle,textAlign:'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order, i) => (
                  <OrderRow key={order.id} order={order} isLast={i === stats.recentOrders.length-1}/>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Upcoming deadlines ── */}
      {!loading && stats && stats.upcomingDeadlines.length > 0 && (
        <div>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
            <CalendarClock size={16} color="var(--crm-yellow)" strokeWidth={2}/>
            <h2 style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)',margin:0 }}>Ближайшие дедлайны</h2>
            <span style={{ fontSize:12,color:'var(--crm-muted)' }}>— следующие 7 дней</span>
          </div>
          <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
            {stats.upcomingDeadlines.map((order, i) => (
              <div key={order.id} style={{
                display:'flex',alignItems:'center',gap:16,padding:'14px 16px',
                borderBottom: i < stats.upcomingDeadlines.length-1 ? '1px solid var(--crm-border)' : 'none',
                transition:'background 0.12s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                {/* Дедлайн — акцент */}
                <div style={{ flexShrink:0,minWidth:70,textAlign:'center' }}>
                  <div style={{ fontSize:13,fontWeight:700,color:getDeadlineColor(order.deadline) }}>
                    {order.deadline ? formatDate(order.deadline) : '—'}
                  </div>
                </div>
                {/* Название + клиент */}
                <div style={{ flex:1,minWidth:0 }}>
                  <Link href={`/orders/${order.id}`} style={{ fontSize:13,fontWeight:600,color:'var(--crm-text)',textDecoration:'none' }} className="crm-order-id-link">
                    #{order.order_number} — {order.project_name}
                  </Link>
                  <div style={{ fontSize:12,color:'var(--crm-muted)',marginTop:2 }}>
                    {order.client?.name ?? '—'}
                  </div>
                </div>
                {/* Статус */}
                <div style={{ flexShrink:0 }}>
                  <OrderStatusBadge status={order.status}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .crm-order-id-link:hover { color: var(--crm-blue) !important; }
        .crm-eye-link:hover { background: var(--crm-border2) !important; color: var(--crm-text) !important; }
        @keyframes crm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
