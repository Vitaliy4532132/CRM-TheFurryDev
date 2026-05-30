'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, BarChart2, UserPlus,
  Trophy, Calculator, Star, Target, Clock, AlertTriangle, BarChart3,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getPayments, getExpenses, getOrders, getClients, getRequests } from '@/lib/crm/api'
import {
  formatMoney, getDateRange, getPrevDateRange,
  getGrouping, getBucketLabel, getBucketMs,
} from '@/lib/crm/helpers'
import type { CRMPayment, CRMExpense, CRMOrder, CRMClient, CRMRequest } from '@/types/crm'

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: '7d',  label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: '3m',  label: '3 месяца' },
  { key: '6m',  label: '6 месяцев' },
  { key: '1y',  label: 'Год' },
  { key: 'all', label: 'Всё время' },
]

const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

const EXPENSE_COLORS: Record<string, string> = {
  ads:        '#f97316',
  hosting:    '#3b82f6',
  domain:     '#14b8a6',
  plugins:    '#a855f7',
  salary:     '#22c55e',
  commission: '#eab308',
  refund:     '#ef4444',
  other:      '#64748b',
}

const EXPENSE_LABELS: Record<string, string> = {
  ads:        'Реклама',
  hosting:    'Хостинг',
  domain:     'Домен',
  plugins:    'Плагины',
  salary:     'Зарплата',
  commission: 'Комиссии',
  refund:     'Возврат',
  other:      'Другое',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inRange(dateStr: string, from: Date, to: Date): boolean {
  const d = new Date(dateStr)
  return d >= from && d <= to
}

function calcChange(cur: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  return { pct, up: pct >= 0 }
}

function buildTimeSeries(
  payments: CRMPayment[],
  expenses: CRMExpense[],
  period: string,
): { label: string; income: number; expenses: number; profit: number }[] {
  const grouping = getGrouping(period)
  const bucketMap = new Map<number, { label: string; income: number; expenses: number }>()

  const touch = (dateStr: string) => {
    const d   = new Date(dateStr)
    const ms  = getBucketMs(d, grouping)
    if (!bucketMap.has(ms)) {
      bucketMap.set(ms, { label: getBucketLabel(d, grouping), income: 0, expenses: 0 })
    }
    return ms
  }

  payments.forEach(p => {
    const ms = touch(p.payment_date)
    bucketMap.get(ms)!.income += p.amount
  })
  expenses.forEach(e => {
    const ms = touch(e.date)
    bucketMap.get(ms)!.expenses += e.amount
  })

  return [...bucketMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, v]) => ({ ...v, profit: v.income - v.expenses }))
}

function buildDayOfWeek(payments: CRMPayment[]): { label: string; income: number }[] {
  const sums = new Array(7).fill(0)
  payments.forEach(p => {
    const day = (new Date(p.payment_date).getDay() + 6) % 7 // 0=Mon
    sums[day] += p.amount
  })
  return WEEKDAYS.map((label, i) => ({ label, income: sums[i] }))
}

function buildExpensesByCategory(expenses: CRMExpense[]): { name: string; value: number; color: string }[] {
  const map: Record<string, number> = {}
  expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
  return Object.entries(map)
    .map(([cat, value]) => ({
      name:  EXPENSE_LABELS[cat] ?? cat,
      value,
      color: EXPENSE_COLORS[cat] ?? '#64748b',
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
}

function buildTopClients(
  payments: CRMPayment[],
  clients: CRMClient[],
): { name: string; income: number }[] {
  const map: Record<string, number> = {}
  payments.forEach(p => {
    if (!p.client_id) return
    map[p.client_id] = (map[p.client_id] || 0) + p.amount
  })
  const clientMap = new Map(clients.map(c => [c.id, c.name]))
  return Object.entries(map)
    .map(([id, income]) => ({ name: clientMap.get(id) ?? id.slice(0, 6), income }))
    .sort((a, b) => b.income - a.income)
    .slice(0, 10)
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w = '100%', h = 14 }: { w?: number | string; h?: number }) {
  return <div style={{ width: w, height: h, background: 'var(--crm-s3)', borderRadius: 6, animation: 'crm-pulse 1.5s ease-in-out infinite' }} />
}

function KpiSkel() {
  return (
    <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skel w={110} h={12} />
      <Skel w={80}  h={28} />
      <Skel w={90}  h={11} />
    </div>
  )
}

function ChartSkel({ h = 300 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--crm-s3)', borderRadius: 8, animation: 'crm-pulse 1.5s ease-in-out infinite' }} />
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, iconColor, iconBg,
  change, sub,
}: {
  label: string; value: string
  icon: typeof TrendingUp; iconColor: string; iconBg: string
  change?: { pct: number; up: boolean } | null
  sub?: string
}) {
  return (
    <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--crm-muted)', fontWeight: 500 }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} style={{ color: iconColor }} strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--crm-text)', letterSpacing: '-0.02em', marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
        {change != null && (
          <span style={{ fontWeight: 600, color: change.up ? 'var(--crm-green)' : 'var(--crm-red)' }}>
            {change.up ? '↑' : '↓'} {Math.abs(change.pct)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}

function ChartBox({ title, children, minH = 300 }: { title: string; children: React.ReactNode; minH?: number }) {
  return (
    <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '20px 20px 12px' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 16 }}>{title}</div>
      <div style={{ height: minH }}>{children}</div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <BarChart3 size={40} color="var(--crm-muted)" strokeWidth={1.25} />
      <div style={{ fontSize: 13, color: 'var(--crm-muted)' }}>Нет данных за этот период</div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {label && <div style={{ color: 'var(--crm-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{formatMoney(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

const StatCard = ({
  icon: Icon, title, value, sub, accent = false,
}: {
  icon: typeof Trophy; title: string; value: string; sub?: string; accent?: boolean
}) => (
  <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
    <div style={{ width: 36, height: 36, borderRadius: 9, background: accent ? 'var(--crm-yellow-dim)' : 'var(--crm-s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={16} style={{ color: accent ? 'var(--crm-yellow)' : 'var(--crm-muted)' }} strokeWidth={1.75} />
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-muted)', marginBottom: 4, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--crm-text)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  </div>
)

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [payments,  setPayments]  = useState<CRMPayment[]>([])
  const [expenses,  setExpenses]  = useState<CRMExpense[]>([])
  const [orders,    setOrders]    = useState<CRMOrder[]>([])
  const [clients,   setClients]   = useState<CRMClient[]>([])
  const [requests,  setRequests]  = useState<CRMRequest[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAllPayments, setShowAllPayments] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getPayments(), getExpenses(), getOrders(), getClients(), getRequests()])
      .then(([p, e, o, c, r]) => { setPayments(p); setExpenses(e); setOrders(o); setClients(c); setRequests(r) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Date ranges ──────────────────────────────────────────────────────────────

  const { from, to } = useMemo(() => getDateRange(period), [period])
  const prev          = useMemo(() => getPrevDateRange(from, to), [from, to])

  // ── Filtered data ────────────────────────────────────────────────────────────

  const fp = useMemo(() => payments.filter(p => inRange(p.payment_date, from, to)),   [payments, from, to])
  const fe = useMemo(() => expenses.filter(e => inRange(e.date, from, to)),            [expenses, from, to])
  const fo = useMemo(() => orders.filter(o => inRange(o.created_at, from, to)),        [orders, from, to])
  const fc = useMemo(() => clients.filter(c => inRange(c.created_at, from, to)),       [clients, from, to])
  const fr = useMemo(() => requests.filter(r => inRange(r.created_at, from, to)),      [requests, from, to])

  // Previous period
  const pp = useMemo(() => payments.filter(p => inRange(p.payment_date, prev.from, prev.to)), [payments, prev])
  const pe = useMemo(() => expenses.filter(e => inRange(e.date, prev.from, prev.to)),          [expenses, prev])

  // ── KPI ──────────────────────────────────────────────────────────────────────

  const totalIncome   = useMemo(() => fp.reduce((s, p) => s + p.amount, 0),  [fp])
  const totalExpense  = useMemo(() => fe.reduce((s, e) => s + e.amount, 0),  [fe])
  const totalProfit   = totalIncome - totalExpense
  const margin        = totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 100) : 0
  const prevIncome    = useMemo(() => pp.reduce((s, p) => s + p.amount, 0),  [pp])
  const prevExpense   = useMemo(() => pe.reduce((s, e) => s + e.amount, 0),  [pe])

  // ── Chart data ────────────────────────────────────────────────────────────────

  const timeSeriesData = useMemo(() => buildTimeSeries(fp, fe, period),        [fp, fe, period])
  const dayOfWeekData  = useMemo(() => buildDayOfWeek(fp),                     [fp])
  const pieData        = useMemo(() => buildExpensesByCategory(fe),             [fe])
  const topClients     = useMemo(() => buildTopClients(fp, clients),            [fp, clients])

  // Highlight max bar in day-of-week chart
  const maxDayIncome = useMemo(() => Math.max(...dayOfWeekData.map(d => d.income)), [dayOfWeekData])

  // ── Interesting stats ─────────────────────────────────────────────────────────

  // Best day by income
  const bestDay = useMemo(() => {
    const map: Record<string, number> = {}
    fp.forEach(p => {
      const key = new Date(p.payment_date).toLocaleDateString('ru-RU')
      map[key] = (map[key] || 0) + p.amount
    })
    const entries = Object.entries(map)
    if (!entries.length) return null
    const [date, amount] = entries.reduce((best, cur) => cur[1] > best[1] ? cur : best)
    return { date, amount }
  }, [fp])

  // Average payment
  const avgPayment = fp.length > 0 ? Math.round(totalIncome / fp.length) : 0

  // Most active client (by orders count)
  const topClientByOrders = useMemo(() => {
    const map: Record<string, { name: string; count: number; amount: number }> = {}
    fo.forEach(o => {
      if (!o.client_id || !o.client) return
      if (!map[o.client_id]) map[o.client_id] = { name: o.client.name, count: 0, amount: 0 }
      map[o.client_id].count++
      map[o.client_id].amount += o.amount
    })
    const entries = Object.values(map)
    if (!entries.length) return null
    return entries.reduce((best, cur) => cur.count > best.count ? cur : best)
  }, [fo])

  // Request conversion
  const totalReq     = fr.length
  const convertedReq = fr.filter(r => r.status === 'converted').length
  const conversionPct = totalReq > 0 ? Math.round((convertedReq / totalReq) * 100) : 0

  // Avg completion time
  const avgDays = useMemo(() => {
    const completed = orders.filter(o => o.status === 'completed')
    if (!completed.length) return null
    const total = completed.reduce((s, o) => {
      return s + (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime())
    }, 0)
    return Math.round(total / completed.length / 86400000)
  }, [orders])

  // Total debt
  const totalDebt   = useMemo(() => orders.reduce((s, o) => s + Math.max(0, o.amount - o.paid), 0), [orders])
  const debtorCount = useMemo(() => orders.filter(o => o.amount > o.paid).length, [orders])

  // ── Payments table ────────────────────────────────────────────────────────────

  const paymentsDesc    = useMemo(() => [...fp].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()), [fp])
  const shownPayments   = showAllPayments ? paymentsDesc : paymentsDesc.slice(0, 10)
  const clientMap       = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients])

  // ── Render ────────────────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.06em', color: 'var(--crm-muted)', textTransform: 'uppercase',
    borderBottom: '1px solid var(--crm-border2)', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Period selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: '1px solid var(--crm-border2)', cursor: 'pointer',
              transition: 'all 0.15s', fontFamily: 'inherit',
              background: period === p.key ? 'var(--crm-blue)' : 'var(--crm-surface)',
              color:      period === p.key ? '#fff'            : 'var(--crm-muted)',
              borderColor: period === p.key ? 'var(--crm-blue)' : 'var(--crm-border2)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {loading ? [0,1,2,3].map(i => <KpiSkel key={i}/>) : (
          <>
            <KpiCard
              label="Доход" value={formatMoney(totalIncome)}
              icon={TrendingUp} iconColor="var(--crm-green)" iconBg="var(--crm-green-dim)"
              change={period !== 'all' ? calcChange(totalIncome, prevIncome) : null}
              sub="за период"
            />
            <KpiCard
              label="Расходы" value={formatMoney(totalExpense)}
              icon={TrendingDown} iconColor="var(--crm-red)" iconBg="var(--crm-red-dim)"
              change={period !== 'all' ? calcChange(totalExpense, prevExpense) : null}
              sub="за период"
            />
            <KpiCard
              label="Прибыль" value={formatMoney(totalProfit)}
              icon={BarChart2} iconColor="var(--crm-teal)" iconBg="var(--crm-teal-dim)"
              change={null}
              sub={`маржа ${margin}%`}
            />
            <KpiCard
              label="Новых клиентов" value={String(fc.length)}
              icon={UserPlus} iconColor="var(--crm-purple)" iconBg="var(--crm-purple-dim)"
              change={null}
              sub="за период"
            />
          </>
        )}
      </div>

      {/* ── Line chart: income & expenses over time ── */}
      {loading ? (
        <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: 20 }}>
          <Skel w={160} h={16} />
          <div style={{ marginTop: 16 }}><ChartSkel h={300} /></div>
        </div>
      ) : (
        <ChartBox title="Доходы, расходы и прибыль">
          {timeSeriesData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--crm-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}к`} tick={{ fontSize: 11, fill: 'var(--crm-muted)' }} tickLine={false} axisLine={false} width={40}/>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--crm-muted)', paddingTop: 8 }} />
                <Line type="monotone" dataKey="income"   name="Доход"   stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Расходы" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit"   name="Прибыль" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      )}

      {/* ── Two charts side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Day of week */}
        {loading ? (
          <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: 20 }}>
            <Skel w={160} h={16} /><div style={{ marginTop: 16 }}><ChartSkel h={260} /></div>
          </div>
        ) : (
          <ChartBox title="Доход по дням недели" minH={260}>
            {fp.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-border)" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--crm-muted)' }} tickLine={false} axisLine={false}/>
                  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}к`} tick={{ fontSize: 11, fill: 'var(--crm-muted)' }} tickLine={false} axisLine={false} width={36}/>
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Доход" radius={[4,4,0,0]}>
                    {dayOfWeekData.map((entry, index) => (
                      <Cell key={index} fill={entry.income === maxDayIncome && maxDayIncome > 0 ? '#22c55e' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartBox>
        )}

        {/* Expenses by category (donut) */}
        {loading ? (
          <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: 20 }}>
            <Skel w={160} h={16} /><div style={{ marginTop: 16 }}><ChartSkel h={260} /></div>
          </div>
        ) : (
          <ChartBox title="Распределение расходов" minH={260}>
            {pieData.length === 0 ? <EmptyChart /> : (
              <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 16 }}>
                <div style={{ flex: 1, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                      </Pie>
                      <Tooltip content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                            <span style={{ color: payload[0].payload.color, fontWeight: 600 }}>{payload[0].name}</span>
                            <div style={{ color: 'var(--crm-text)' }}>{formatMoney(payload[0].value as number)}</div>
                          </div>
                        ) : null
                      }/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, fontSize: 11 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }}/>
                      <span style={{ color: 'var(--crm-muted)' }}>{d.name}</span>
                      <span style={{ color: 'var(--crm-text)', fontWeight: 600 }}>{formatMoney(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartBox>
        )}
      </div>

      {/* ── Top clients horizontal bar ── */}
      {loading ? (
        <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: 20 }}>
          <Skel w={200} h={16} /><div style={{ marginTop: 16 }}><ChartSkel h={280} /></div>
        </div>
      ) : (
        <ChartBox title="Топ клиентов по доходу" minH={Math.max(200, topClients.length * 38 + 40)}>
          {topClients.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topClients} margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-border)" horizontal={false}/>
                <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}к`} tick={{ fontSize: 11, fill: 'var(--crm-muted)' }} tickLine={false} axisLine={false}/>
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--crm-muted)' }} tickLine={false} axisLine={false}/>
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="Доход" radius={[0,4,4,0]}>
                  {topClients.map((_, i) => {
                    const pct = i / Math.max(topClients.length - 1, 1)
                    const r = Math.round(59 + pct * (168 - 59))
                    const g = Math.round(130 + pct * (85  - 130))
                    const b = Math.round(246 + pct * (247 - 246))
                    return <Cell key={i} fill={`rgb(${r},${g},${b})`} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      )}

      {/* ── Interesting stats (6 cards) ── */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 12 }}>Интересная статистика</div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[0,1,2,3,4,5].map(i => <div key={i} style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14 }}><Skel w={36} h={36}/><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}><Skel w="60%" h={11}/><Skel w="80%" h={16}/></div></div>)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <StatCard
              icon={Trophy} title="Лучший день"
              value={bestDay ? formatMoney(bestDay.amount) : '—'}
              sub={bestDay ? bestDay.date : 'Нет данных'}
            />
            <StatCard
              icon={Calculator} title="Средний чек"
              value={avgPayment > 0 ? formatMoney(avgPayment) : '—'}
              sub={`${fp.length} платежей за период`}
            />
            <StatCard
              icon={Star} title="Самый активный клиент"
              value={topClientByOrders ? topClientByOrders.name : '—'}
              sub={topClientByOrders ? `${topClientByOrders.count} заказов · ${formatMoney(topClientByOrders.amount)}` : undefined}
            />
            <StatCard
              icon={Target} title="Конверсия заявок"
              value={totalReq > 0 ? `${conversionPct}%` : '—'}
              sub={totalReq > 0 ? `${convertedReq} из ${totalReq} заявок` : 'Нет заявок за период'}
            />
            <StatCard
              icon={Clock} title="Средний срок выполнения"
              value={avgDays !== null ? `${avgDays} дней` : '—'}
              sub="По завершённым заказам"
            />
            <StatCard
              icon={AlertTriangle} title="Незакрытый долг"
              value={formatMoney(totalDebt)}
              sub={`${debtorCount} должников`}
              accent
            />
          </div>
        )}
      </div>

      {/* ── Payments table ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)' }}>Платежи за период</div>
          <span style={{ fontSize: 12, color: 'var(--crm-muted)' }}>{fp.length} платежей</span>
        </div>

        <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0,1,2,3,4].map(i => <Skel key={i} h={14} />)}
            </div>
          ) : fp.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--crm-muted)', fontSize: 13 }}>
              Нет платежей за этот период
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--crm-s3)' }}>
                    <tr>
                      <th style={thStyle}>Клиент</th>
                      <th style={thStyle}>Сумма</th>
                      <th style={thStyle}>Способ</th>
                      <th style={thStyle}>Дата</th>
                      <th style={thStyle}>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownPayments.map((p, i) => {
                      const METHOD_LABELS: Record<string, string> = { card:'Карта', transfer:'Перевод', crypto:'Крипта', paypal:'PayPal', other:'Другое' }
                      return (
                        <tr key={p.id} style={{ borderBottom: i < shownPayments.length - 1 ? '1px solid var(--crm-border)' : 'none', transition: 'background 0.12s' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
                          onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                          <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--crm-text)' }}>
                            {p.client?.name ?? clientMap.get(p.client_id ?? '') ?? '—'}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: 'var(--crm-green)', whiteSpace: 'nowrap' }}>
                            +{formatMoney(p.amount)}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--crm-muted)' }}>
                            {p.payment_method ? (METHOD_LABELS[p.payment_method] ?? p.payment_method) : '—'}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--crm-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(p.payment_date).toLocaleDateString('ru-RU')}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--crm-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.comment ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {fp.length > 10 && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--crm-border2)', textAlign: 'center' }}>
                  <button
                    onClick={() => setShowAllPayments(v => !v)}
                    style={{ fontSize: 13, color: 'var(--crm-blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                  >
                    {showAllPayments ? 'Свернуть' : `Показать все (${fp.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
