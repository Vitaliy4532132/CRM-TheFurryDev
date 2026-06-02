'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, BarChart2,
  Wallet, Receipt, PiggyBank, AlertTriangle, Plus, CreditCard,
} from 'lucide-react'
import { StatCard } from '@/components/crm/stat-card'
import { SensitiveValue } from '@/components/crm/sensitive-value'
import { CreatePaymentModal } from '@/components/crm/modals/create-payment-modal'
import { getPayments, getExpenses, getOrders } from '@/lib/crm/api'
import { formatMoney, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/crm/helpers'
import type { CRMPayment, CRMOrder, CRMExpense } from '@/types/crm'

// ── Method badge ──────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
  card:     { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  transfer: { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  crypto:   { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  paypal:   { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  other:    { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
}

function MethodBadge({ method }: { method: string | null }) {
  const key = method ?? 'other'
  const cfg = METHOD_COLORS[key] ?? METHOD_COLORS.other
  return (
    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:cfg.color,background:cfg.bg }}>
      {PAYMENT_METHOD_LABELS[key] ?? key}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatSkel() {
  return (
    <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:'18px 20px' }}>
      <div style={{ height:12,width:100,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite',marginBottom:12 }}/>
      <div style={{ height:28,width:80,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom:'1px solid var(--crm-border)' }}>
      {[30,70,90,70,80,80,120].map((w,i)=>(
        <td key={i} style={{ padding:'12px 14px' }}>
          <div style={{ height:13,width:w,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        </td>
      ))}
    </tr>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding:'11px 14px', textAlign:'left',
  fontSize:11, fontWeight:600, letterSpacing:'0.06em',
  color:'var(--crm-muted)', textTransform:'uppercase',
  borderBottom:'1px solid var(--crm-border2)', whiteSpace:'nowrap',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [payments,   setPayments]   = useState<CRMPayment[]>([])
  const [expenses,   setExpenses]   = useState<CRMExpense[]>([])
  const [orders,     setOrders]     = useState<CRMOrder[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modalOpen,  setModalOpen]  = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [p, e, o] = await Promise.all([getPayments(), getExpenses(), getOrders()])
      setPayments(p); setExpenses(e); setOrders(o)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Статистика ──────────────────────────────────────────────────────────────

  const now              = new Date()
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const monthPayments = payments.filter(p => new Date(p.payment_date) >= startOfMonth)
  const monthExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth)
  const lastMonthPayments = payments.filter(p => {
    const d = new Date(p.payment_date)
    return d >= startOfLastMonth && d < startOfMonth
  })
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d >= startOfLastMonth && d < startOfMonth
  })

  const monthIncome   = monthPayments.reduce((s, p) => s + p.amount, 0)
  const monthExpense  = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const monthProfit   = monthIncome - monthExpense
  const lastIncome    = lastMonthPayments.reduce((s, p) => s + p.amount, 0)
  const lastExpense   = lastMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalIncome   = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpense  = expenses.reduce((s, e) => s + e.amount, 0)
  const totalProfit   = totalIncome - totalExpense
  const totalDebt     = orders.reduce((s, o) => s + Math.max(0, o.amount - o.paid), 0)

  function delta(current: number, prev: number) {
    if (prev === 0) return null
    const pct = Math.round(((current - prev) / prev) * 100)
    const pos = pct >= 0
    return { label: `${pos ? '↑ +' : '↓ '}${pct}% к прошлому`, positive: pos }
  }

  const incomeDelta  = delta(monthIncome,  lastIncome)
  const expenseDelta = delta(monthExpense, lastExpense)

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Row 1: This month ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
        {loading ? [0,1,2].map(i=><StatSkel key={i}/>) : (
          <>
            <StatCard label="Доход за месяц"   value={formatMoney(monthIncome)}  icon={TrendingUp}  iconColor="var(--crm-green)"  iconBg="var(--crm-green-dim)"  valueColor="var(--crm-green)"  delta={incomeDelta?.label}  deltaPositive={incomeDelta?.positive}  sensitive/>
            <StatCard label="Расходы за месяц" value={formatMoney(monthExpense)} icon={TrendingDown} iconColor="var(--crm-red)"    iconBg="var(--crm-red-dim)"    valueColor="var(--crm-red)"    delta={expenseDelta?.label} deltaPositive={expenseDelta?.positive === false ? false : undefined} sensitive/>
            <StatCard label="Прибыль за месяц" value={formatMoney(monthProfit)}  icon={BarChart2}   iconColor="var(--crm-teal)"   iconBg="var(--crm-teal-dim)"   valueColor="var(--crm-teal)"  sensitive/>
          </>
        )}
      </div>

      {/* ── Row 2: All time ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
        {loading ? [0,1,2].map(i=><StatSkel key={i}/>) : (
          <>
            <StatCard label="Доход за всё время"   value={formatMoney(totalIncome)}  icon={Wallet}    iconColor="var(--crm-green)"  iconBg="var(--crm-green-dim)"  valueColor="var(--crm-green)"  sub="с начала работы"  sensitive/>
            <StatCard label="Расходы за всё время" value={formatMoney(totalExpense)} icon={Receipt}   iconColor="var(--crm-red)"    iconBg="var(--crm-red-dim)"    valueColor="var(--crm-red)"    sub="за всё время"     sensitive/>
            <StatCard label="Прибыль за всё время" value={formatMoney(totalProfit)}  icon={PiggyBank} iconColor="var(--crm-teal)"   iconBg="var(--crm-teal-dim)"   valueColor="var(--crm-teal)"   sub="чистая прибыль"   sensitive/>
          </>
        )}
      </div>

      {/* ── Debt card ── */}
      <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:20,display:'flex',alignItems:'center',gap:16 }}>
        <div style={{ width:44,height:44,borderRadius:10,background:'var(--crm-yellow-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <AlertTriangle size={20} color="var(--crm-yellow)" strokeWidth={2}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13,color:'var(--crm-muted)',marginBottom:4 }}>Долги клиентов (неоплаченные заказы)</div>
          <div style={{ fontSize:11,color:'var(--crm-muted)',opacity:0.7 }}>Сумма всех неоплаченных и частично оплаченных заказов</div>
        </div>
        <div style={{ fontSize:28,fontWeight:700,color:'var(--crm-yellow)',letterSpacing:'-0.02em',flexShrink:0 }}>
          {loading ? '—' : <SensitiveValue>{formatMoney(totalDebt)}</SensitiveValue>}
        </div>
      </div>

      {/* ── Payments table ── */}
      <div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
          <h2 style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)',margin:0 }}>История платежей</h2>
          <button onClick={() => setModalOpen(true)} style={{ display:'flex',alignItems:'center',gap:7,height:36,padding:'0 14px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
            <Plus size={14} strokeWidth={2.5}/>Добавить платёж
          </button>
        </div>

        <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead style={{ background:'var(--crm-s3)' }}>
                <tr>
                  <th style={thStyle}>№</th>
                  <th style={thStyle}>Заказ</th>
                  <th style={thStyle}>Клиент</th>
                  <th style={thStyle}>Сумма</th>
                  <th style={thStyle}>Способ оплаты</th>
                  <th style={thStyle}>Дата</th>
                  <th style={thStyle}>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {loading && [0,1,2,3,4].map(i=><SkeletonRow key={i}/>)}

                {!loading && payments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding:'48px 24px',textAlign:'center' }}>
                      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
                        <CreditCard size={48} color="var(--crm-muted)" strokeWidth={1.25}/>
                        <div style={{ fontSize:15,fontWeight:600,color:'var(--crm-text)' }}>Платежей пока нет</div>
                        <div style={{ fontSize:13,color:'var(--crm-muted)' }}>Добавьте первый платёж</div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && payments.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom:i<payments.length-1?'1px solid var(--crm-border)':'none',transition:'background 0.12s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'var(--crm-muted)' }}>{i+1}</td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,whiteSpace:'nowrap' }}>
                      {p.order_id ? (
                        <Link href={`/orders/${p.order_id}`} style={{ color:'var(--crm-blue)',textDecoration:'none' }}>
                          {p.order ? `#${(p.order as CRMOrder & { order_number: number }).order_number}` : '—'}
                        </Link>
                      ) : '—'}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:500,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
                      {p.client?.name ?? '—'}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:700,color:'var(--crm-green)',whiteSpace:'nowrap' }}>
                      <SensitiveValue>+{formatMoney(p.amount)}</SensitiveValue>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <MethodBadge method={p.payment_method}/>
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                      {formatDate(p.payment_date)}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)' }}>
                      {p.comment ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div style={{ padding:'14px 16px',borderTop:'1px solid var(--crm-border2)' }}>
              <span style={{ fontSize:13,color:'var(--crm-muted)' }}>
                Показано {payments.length} из {payments.length} платежей
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      <CreatePaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => loadAll()}
        orders={orders}
      />
    </div>
  )
}
