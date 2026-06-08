'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, BarChart2, List,
  Eye, EyeOff, ArrowLeftRight, Trash2, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getPayments, getExpenses,
  getHiddenTransactions, hideTransaction, unhideTransaction,
  deleteCRMPayment, deleteCRMExpense,
} from '@/lib/crm/api'
import { formatMoney, formatDate } from '@/lib/crm/helpers'
import { EXPENSE_CATEGORY_LABELS } from '@/types/crm'
import { SensitiveValue } from '@/components/crm/sensitive-value'
import type { CRMPayment, CRMExpense } from '@/types/crm'

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'payment' | 'expense' | 'balance_transaction' | 'purchase'

interface UnifiedTransaction {
  id:           string
  source_type:  SourceType
  source_id:    string
  date:         string
  title:        string
  subtitle:     string
  amount:       number
  flow:         'income' | 'expense'
  client_name?: string
  is_hidden:    boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<SourceType, { label: string; color: string; bg: string }> = {
  payment:             { label: 'CRM',      color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  expense:             { label: 'Расход',   color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  balance_transaction: { label: 'Сайт',    color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  purchase:            { label: 'Магазин',  color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
}

const PAGE_SIZE = 20

// ── Builder ───────────────────────────────────────────────────────────────────

function buildTransactions(
  payments:  CRMPayment[],
  expenses:  CRMExpense[],
  balanceTx: any[],
  purchases: any[],
  hidden:    { source_type: string; source_id: string }[],
): UnifiedTransaction[] {
  const all: UnifiedTransaction[] = []

  payments.forEach(p => {
    const order = p.order as any
    all.push({
      id:          'pay_' + p.id,
      source_type: 'payment',
      source_id:   p.id,
      date:        p.payment_date || p.created_at,
      title:       'Оплата заказа',
      subtitle:    order
        ? '#' + order.order_number + ' — ' + order.project_name
        : (p.comment || '—'),
      amount:      p.amount,
      flow:        'income',
      client_name: p.client?.name,
      is_hidden:   false,
    })
  })

  expenses.forEach(e => {
    all.push({
      id:          'exp_' + e.id,
      source_type: 'expense',
      source_id:   e.id,
      date:        e.date,
      title:       e.name,
      subtitle:    EXPENSE_CATEGORY_LABELS[e.category] || e.category,
      amount:      e.amount,
      flow:        'expense',
      is_hidden:   false,
    })
  })

  balanceTx
    .filter(t => t.type === 'admin' && t.amount > 0)
    .forEach(t => {
      all.push({
        id:          'btx_' + t.id,
        source_type: 'balance_transaction',
        source_id:   t.id,
        date:        t.created_at,
        title:       'Пополнение баланса на сайте',
        subtitle:    t.description || t.profile?.nickname || '—',
        amount:      t.amount,
        flow:        'income',
        client_name: t.profile?.nickname,
        is_hidden:   hidden.some(h => h.source_type === 'balance_transaction' && h.source_id === t.id),
      })
    })

  purchases.forEach(p => {
    all.push({
      id:          'pur_' + p.id,
      source_type: 'purchase',
      source_id:   p.id,
      date:        p.created_at,
      title:       'Покупка на сайте',
      subtitle:    p.product?.name || 'Удалённый продукт',
      amount:      Number(p.amount),
      flow:        'income',
      client_name: p.profile?.nickname,
      is_hidden:   hidden.some(h => h.source_type === 'purchase' && h.source_id === p.id),
    })
  })

  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ── Helper components ─────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon, title, color, hoverBg, onClick,
}: {
  icon: typeof Trash2; title: string; color: string; hoverBg: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none',
        background: 'transparent', color, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = hoverBg }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  )
}

function PagBtn({
  children, onClick, disabled, active,
}: {
  children: React.ReactNode; onClick: () => void
  disabled?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 30, padding: '0 6px', borderRadius: 6,
        fontSize: 12, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--crm-blue)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--crm-border2)' : 'var(--crm-muted)',
        border: `1px solid ${active ? 'var(--crm-blue)' : disabled ? 'var(--crm-border)' : 'var(--crm-border2)'}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--crm-border)' }}>
      {[80, 60, 160, 110, 90, 70, 60].map((w, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div style={{ height: 13, width: w, background: 'var(--crm-s3)', borderRadius: 6, animation: 'crm-pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '11px 14px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'var(--crm-muted)', textTransform: 'uppercase',
  borderBottom: '1px solid var(--crm-border2)', whiteSpace: 'nowrap',
}

function filterBtn(active: boolean): React.CSSProperties {
  return {
    height: 32, padding: '0 10px', borderRadius: 6, fontSize: 12,
    fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
    background: active ? 'var(--crm-blue-dim)' : 'var(--crm-s3)',
    color:      active ? 'var(--crm-blue)' : 'var(--crm-muted)',
    border:     active ? '1px solid var(--crm-blue)' : '1px solid var(--crm-border2)',
  }
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: 'var(--crm-border2)', flexShrink: 0 }} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [payments,    setPayments]    = useState<CRMPayment[]>([])
  const [expenses,    setExpenses]    = useState<CRMExpense[]>([])
  const [balanceTx,   setBalanceTx]   = useState<any[]>([])
  const [purchases,   setPurchases]   = useState<any[]>([])
  const [hidden,      setHidden]      = useState<{ source_type: string; source_id: string }[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showHidden,  setShowHidden]  = useState(false)
  const [search,      setSearch]      = useState('')
  const [flowFilter,  setFlowFilter]  = useState<'all' | 'income' | 'expense'>('all')
  const [srcFilter,   setSrcFilter]   = useState<'all' | SourceType>('all')
  const [period,      setPeriod]      = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [page,        setPage]        = useState(1)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [p, e, btxRes, purRes, h] = await Promise.all([
        getPayments(),
        getExpenses(),
        supabase
          .from('balance_transactions')
          .select('*, profile:profiles(nickname, telegram)')
          .order('created_at', { ascending: false }),
        supabase
          .from('purchases')
          .select('*, product:products(name, slug), profile:profiles(nickname)')
          .order('created_at', { ascending: false }),
        getHiddenTransactions(),
      ])
      setPayments(p)
      setExpenses(e)
      setBalanceTx(btxRes.data ?? [])
      setPurchases(purRes.data ?? [])
      setHidden(h)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { setPage(1) }, [search, flowFilter, srcFilter, period, showHidden])

  // ── Build data ───────────────────────────────────────────────────────────────

  const allTx = useMemo(
    () => buildTransactions(payments, expenses, balanceTx, purchases, hidden),
    [payments, expenses, balanceTx, purchases, hidden],
  )

  const filtered = useMemo(() => {
    let list = showHidden ? allTx : allTx.filter(t => !t.is_hidden)

    if (period !== 'all') {
      const days   = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const cutoff = new Date(Date.now() - days * 86400000)
      list = list.filter(t => new Date(t.date) >= cutoff)
    }
    if (flowFilter !== 'all')  list = list.filter(t => t.flow === flowFilter)
    if (srcFilter  !== 'all')  list = list.filter(t => t.source_type === srcFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        (t.client_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [allTx, showHidden, period, flowFilter, srcFilter, search])

  // ── KPI (только видимые, без учёта фильтров) ─────────────────────────────────

  const visibleAll = useMemo(() => allTx.filter(t => !t.is_hidden), [allTx])
  const kpiIncome  = visibleAll.filter(t => t.flow === 'income').reduce((s, t) => s + t.amount, 0)
  const kpiExpense = visibleAll.filter(t => t.flow === 'expense').reduce((s, t) => s + t.amount, 0)
  const kpiProfit  = kpiIncome - kpiExpense
  const kpiCount   = visibleAll.length

  // ── Pagination ───────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageNums = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '...')[] = [1]
    if (page > 3) nums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('...')
    if (totalPages > 1) nums.push(totalPages)
    return nums
  }, [page, totalPages])

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleDelete(tx: UnifiedTransaction, e: React.MouseEvent) {
    e.stopPropagation()
    const msg = tx.source_type === 'payment'
      ? 'Удалить транзакцию? Сумма будет вычтена из оплаченного по заказу. Это действие нельзя отменить.'
      : 'Удалить транзакцию? Это действие нельзя отменить.'
    if (!window.confirm(msg)) return
    if (tx.source_type === 'payment') await deleteCRMPayment(tx.source_id)
    else await deleteCRMExpense(tx.source_id)
    await loadAll()
  }

  async function handleHide(tx: UnifiedTransaction, e: React.MouseEvent) {
    e.stopPropagation()
    await hideTransaction(tx.source_type as 'balance_transaction' | 'purchase', tx.source_id)
    await loadAll()
  }

  async function handleUnhide(tx: UnifiedTransaction, e: React.MouseEvent) {
    e.stopPropagation()
    await unhideTransaction(tx.source_type as 'balance_transaction' | 'purchase', tx.source_id)
    await loadAll()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--crm-text)', margin: 0 }}>Транзакции</h1>
        <button
          onClick={() => setShowHidden(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 36, padding: '0 14px', borderRadius: 8,
            background:   showHidden ? 'var(--crm-red-dim)' : 'var(--crm-s3)',
            border:       showHidden ? '1px solid var(--crm-red)' : '1px solid var(--crm-border2)',
            color:        showHidden ? 'var(--crm-red)' : 'var(--crm-muted)',
            fontSize: 13, fontWeight: showHidden ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >
          {showHidden
            ? <Eye    size={14} strokeWidth={2} />
            : <EyeOff size={14} strokeWidth={2} />
          }
          {showHidden ? 'Скрытые показаны' : 'Показать скрытые'}
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {([
          { label: 'Доход',          value: formatMoney(kpiIncome),  icon: TrendingUp,   color: 'var(--crm-green)', sensitive: true },
          { label: 'Расходы',        value: formatMoney(kpiExpense), icon: TrendingDown, color: 'var(--crm-red)',   sensitive: true },
          { label: 'Прибыль',        value: formatMoney(kpiProfit),  icon: BarChart2,    color: 'var(--crm-teal)', sensitive: true },
          { label: 'Всего операций', value: String(kpiCount),        icon: List,         color: 'var(--crm-blue)', sensitive: false },
        ] as const).map(({ label, value, icon: Icon, color, sensitive }) => (
          <div key={label} style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--crm-muted)', marginBottom: 8 }}>
              <Icon size={12} strokeWidth={2} style={{ color, flexShrink: 0 }} />
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em' }}>
              {sensitive ? <SensitiveValue>{value}</SensitiveValue> : value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Поиск по описанию, клиенту..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 34, background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)', borderRadius: 8, color: 'var(--crm-text)', fontSize: 13, paddingLeft: 32, paddingRight: 10, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <Divider />

        {/* Flow */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'income', 'expense'] as const).map(v => (
            <button key={v} onClick={() => setFlowFilter(v)} style={filterBtn(flowFilter === v)}>
              {v === 'all' ? 'Все' : v === 'income' ? 'Доходы' : 'Расходы'}
            </button>
          ))}
        </div>

        <Divider />

        {/* Source */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([
            ['all',                 'Все'],
            ['payment',             'CRM платежи'],
            ['expense',             'CRM расходы'],
            ['balance_transaction', 'Пополнения сайта'],
            ['purchase',            'Покупки сайта'],
          ] as const).map(([v, label]) => (
            <button key={v} onClick={() => setSrcFilter(v)} style={filterBtn(srcFilter === v)}>
              {label}
            </button>
          ))}
        </div>

        <Divider />

        {/* Period */}
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            ['7d',  '7д'],
            ['30d', '30д'],
            ['90d', '3м'],
            ['all', 'Всё время'],
          ] as const).map(([v, label]) => (
            <button key={v} onClick={() => setPeriod(v)} style={filterBtn(period === v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead style={{ background: 'var(--crm-s3)' }}>
              <tr>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Тип</th>
                <th style={thStyle}>Описание</th>
                <th style={thStyle}>Клиент</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Сумма</th>
                <th style={thStyle}>Источник</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && [0,1,2,3,4,5].map(i => <SkeletonRow key={i} />)}

              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <ArrowLeftRight size={48} color="var(--crm-muted)" strokeWidth={1.25} />
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--crm-text)' }}>Транзакций пока нет</div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginated.map((tx, i) => {
                const src    = SOURCE_BADGE[tx.source_type]
                const isLast = i === paginated.length - 1
                const isSite = tx.source_type === 'balance_transaction' || tx.source_type === 'purchase'
                const isCRM  = tx.source_type === 'payment' || tx.source_type === 'expense'

                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--crm-border)',
                      transition: 'background 0.12s',
                      opacity:    tx.is_hidden ? 0.4 : 1,
                      background: tx.is_hidden ? 'rgba(239,68,68,0.05)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!tx.is_hidden) e.currentTarget.style.background = 'var(--crm-surface-hover)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = tx.is_hidden ? 'rgba(239,68,68,0.05)' : 'transparent'
                    }}
                  >
                    {/* Дата */}
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, color: 'var(--crm-text)' }}>{formatDate(tx.date)}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 2 }}>
                        {(() => {
                          const d = new Date(tx.date)
                          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                        })()}
                      </div>
                    </td>

                    {/* Тип */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                        color:      tx.flow === 'income' ? 'var(--crm-green)' : 'var(--crm-red)',
                        background: tx.flow === 'income' ? 'var(--crm-green-dim)' : 'var(--crm-red-dim)',
                      }}>
                        {tx.flow === 'income' ? 'Доход' : 'Расход'}
                      </span>
                    </td>

                    {/* Описание */}
                    <td style={{ padding: '11px 14px', minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text)' }}>{tx.title}</span>
                        {tx.is_hidden && (
                          <span style={{ fontSize: 11, color: 'var(--crm-muted)' }}>(скрыто)</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--crm-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                        {tx.subtitle}
                      </div>
                    </td>

                    {/* Клиент */}
                    <td style={{ padding: '11px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {tx.client_name
                        ? <span style={{ color: 'var(--crm-text)' }}>{tx.client_name}</span>
                        : <span style={{ color: 'var(--crm-muted)' }}>—</span>
                      }
                    </td>

                    {/* Сумма */}
                    <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <SensitiveValue>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: tx.flow === 'income' ? 'var(--crm-green)' : 'var(--crm-red)',
                        }}>
                          {tx.flow === 'income' ? '+' : '−'}{formatMoney(tx.amount)}
                        </span>
                      </SensitiveValue>
                    </td>

                    {/* Источник */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                        color: src.color, background: src.bg,
                      }}>
                        {src.label}
                      </span>
                    </td>

                    {/* Действия */}
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        {isCRM && (
                          <ActionBtn
                            icon={Trash2}
                            title="Удалить"
                            color="var(--crm-red)"
                            hoverBg="var(--crm-red-dim)"
                            onClick={e => handleDelete(tx, e)}
                          />
                        )}
                        {isSite && !tx.is_hidden && (
                          <ActionBtn
                            icon={EyeOff}
                            title="Скрыть"
                            color="var(--crm-muted)"
                            hoverBg="var(--crm-s3)"
                            onClick={e => handleHide(tx, e)}
                          />
                        )}
                        {isSite && tx.is_hidden && showHidden && (
                          <ActionBtn
                            icon={Eye}
                            title="Показать"
                            color="var(--crm-blue)"
                            hoverBg="var(--crm-blue-dim)"
                            onClick={e => handleUnhide(tx, e)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--crm-border2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--crm-muted)' }}>
              Показано {Math.min(page * PAGE_SIZE, filtered.length)} из {filtered.length} транзакций
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} strokeWidth={2} />
                </PagBtn>
                {pageNums.map((n, i) =>
                  n === '...'
                    ? <span key={'e' + i} style={{ display: 'flex', alignItems: 'center', padding: '0 2px', fontSize: 12, color: 'var(--crm-muted)' }}>…</span>
                    : <PagBtn key={n} onClick={() => setPage(n as number)} active={page === n}>{n}</PagBtn>
                )}
                <PagBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={14} strokeWidth={2} />
                </PagBtn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
