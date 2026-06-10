'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingDown, Receipt, Users, List,
  Search, Plus, Pencil, Trash2,
} from 'lucide-react'
import { StatCard } from '@/components/crm/stat-card'
import { SensitiveValue } from '@/components/crm/sensitive-value'
import { CreateExpenseModal } from '@/components/crm/modals/create-expense-modal'
import { EditExpenseModal } from '@/components/crm/modals/edit-expense-modal'
import { ConfirmDialog } from '@/components/crm/confirm-dialog'
import { toast } from '@/components/crm/toast'
import { getExpenses, deleteCRMExpense } from '@/lib/crm/api'
import { formatMoney, formatDate, EXPENSE_CATEGORY_LABELS } from '@/lib/crm/helpers'
import type { CRMExpense, ExpenseCategory } from '@/types/crm'

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  hosting:    { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  domain:     { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  ads:        { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  plugins:    { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  salary:     { color: 'var(--crm-green)',  bg: 'var(--crm-green-dim)' },
  commission: { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  refund:     { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
  other:      { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
}

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
  const label = EXPENSE_CATEGORY_LABELS[category] ?? category
  return (
    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:cfg.color,background:cfg.bg }}>
      {label}
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
      {[30,140,80,70,80,130].map((w,i)=>(
        <td key={i} style={{ padding:'12px 14px' }}>
          <div style={{ height:13,width:w,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        </td>
      ))}
      <td style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:6 }}>
          {[0,1].map(i=><div key={i} style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',animation:'crm-pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      </td>
    </tr>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({ icon:Icon, danger, title, onClick }: {
  icon: typeof Pencil; danger?: boolean; title: string; onClick?: () => void
}) {
  return (
    <button title={title} onClick={(e) => { e.stopPropagation(); onClick?.() }} style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s',flexShrink:0 }}
      onMouseEnter={e=>{e.currentTarget.style.background=danger?'var(--crm-red-dim)':'var(--crm-border2)';e.currentTarget.style.color=danger?'var(--crm-red)':'var(--crm-text)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
      <Icon size={13} strokeWidth={1.75}/>
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding:'11px 14px', textAlign:'left',
  fontSize:11, fontWeight:600, letterSpacing:'0.06em',
  color:'var(--crm-muted)', textTransform:'uppercase',
  borderBottom:'1px solid var(--crm-border2)', whiteSpace:'nowrap',
}

const inputBase: React.CSSProperties = {
  height:38, background:'var(--crm-surface)',
  border:'1px solid var(--crm-border2)', borderRadius:8,
  color:'var(--crm-text)', fontSize:13, outline:'none',
  transition:'border-color 0.15s',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses,       setExpenses]       = useState<CRMExpense[]>([])
  const [loading,        setLoading]        = useState(true)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [editingExpense, setEditingExpense] = useState<CRMExpense | null>(null)
  const [search,         setSearch]         = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('')
  const [period,         setPeriod]         = useState('')
  const [error,          setError]          = useState<string | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<CRMExpense | null>(null)

  // quiet=true — тихое обновление после модалок, без мигания скелетоном
  const loadExpenses = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)
    try { setExpenses(await getExpenses()) }
    catch { setError('Не удалось загрузить расходы') }
    finally { if (!quiet) setLoading(false) }
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const now              = new Date()
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfYear      = new Date(now.getFullYear(), 0, 1)

  const filtered = useMemo(() => expenses.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && e.category !== categoryFilter) return false
    const d = new Date(e.date)
    if (period === 'month'      && d < startOfMonth)     return false
    if (period === 'last_month' && (d < startOfLastMonth || d >= startOfMonth)) return false
    if (period === 'year'       && d < startOfYear)      return false
    return true
    // startOf* пересоздаются каждый рендер, но их значения стабильны в рамках дня
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [expenses, search, categoryFilter, period])

  // ── Статистика ─────────────────────────────────────────────────────────────

  const monthExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth)
  const monthTotal    = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const allTotal      = expenses.reduce((s, e) => s + e.amount, 0)
  const monthCount    = monthExpenses.length

  // Самая крупная категория
  const categoryTotals: Record<string, number> = {}
  for (const e of expenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount
  }
  const topCategoryKey = Object.entries(categoryTotals).sort(([,a],[,b]) => b - a)[0]?.[0]
  const topCategoryLabel = topCategoryKey ? (EXPENSE_CATEGORY_LABELS[topCategoryKey] ?? topCategoryKey) : '—'

  // ── Удаление ───────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deletingExpense) return
    const exp = deletingExpense
    try {
      await deleteCRMExpense(exp.id)
      setExpenses(prev => prev.filter(e => e.id !== exp.id))
      toast.success(`Расход «${exp.name}» удалён`)
    } catch {
      toast.error('Не удалось удалить расход')
    } finally {
      setDeletingExpense(null)
    }
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {error && (
        <div style={{ padding:'14px 16px',borderRadius:10,background:'var(--crm-red-dim)',color:'var(--crm-red)',fontSize:13 }}>{error}</div>
      )}

      {/* ── Stats ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
        {loading ? [0,1,2,3].map(i=><StatSkel key={i}/>) : (
          <>
            <StatCard label="Расходы за месяц"       value={formatMoney(monthTotal)} icon={TrendingDown} iconColor="var(--crm-red)"    iconBg="var(--crm-red-dim)"    valueColor="var(--crm-red)"    sub="текущий месяц"    sensitive/>
            <StatCard label="Расходы за всё время"   value={formatMoney(allTotal)}   icon={Receipt}      iconColor="var(--crm-red)"    iconBg="var(--crm-red-dim)"    valueColor="var(--crm-red)"    sub="за всё время"     sensitive/>
            <StatCard label="Самая крупная категория" value={topCategoryLabel}        icon={Users}        iconColor="var(--crm-orange)" iconBg="var(--crm-orange-dim)" sub="по сумме расходов"/>
            <StatCard label="Транзакций за месяц"    value={monthCount}              icon={List}         iconColor="var(--crm-blue)"   iconBg="var(--crm-blue-dim)"   sub="операций"                 sensitive/>
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:'1 1 220px',minWidth:180 }}>
          <Search size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--crm-muted)',pointerEvents:'none' }}/>
          <input type="text" placeholder="Поиск по названию..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ ...inputBase,width:'100%',paddingLeft:34,paddingRight:12,boxSizing:'border-box' }}
            onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
            onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}/>
        </div>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value as ExpenseCategory | '')}
          style={{ ...inputBase,padding:'0 12px',cursor:'pointer',flexShrink:0 }}
          onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
          onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}>
          <option value="">Все категории</option>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k,v])=>(
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={period} onChange={e=>setPeriod(e.target.value)}
          style={{ ...inputBase,padding:'0 12px',cursor:'pointer',flexShrink:0 }}
          onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
          onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}>
          <option value="">Все время</option>
          <option value="month">Этот месяц</option>
          <option value="last_month">Прошлый месяц</option>
          <option value="year">Этот год</option>
        </select>
        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}`}</style>
      </div>

      {/* ── Table ── */}
      <div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
          <h2 style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)',margin:0 }}>Расходы</h2>
          <button onClick={()=>setModalOpen(true)} style={{ display:'flex',alignItems:'center',gap:7,height:36,padding:'0 14px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
            <Plus size={14} strokeWidth={2.5}/>Добавить расход
          </button>
        </div>

        <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead style={{ background:'var(--crm-s3)' }}>
                <tr>
                  <th style={thStyle}>№</th>
                  <th style={thStyle}>Название</th>
                  <th style={thStyle}>Категория</th>
                  <th style={thStyle}>Сумма</th>
                  <th style={thStyle}>Дата</th>
                  <th style={thStyle}>Комментарий</th>
                  <th style={{ ...thStyle,textAlign:'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading && [0,1,2,3,4].map(i=><SkeletonRow key={i}/>)}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding:'48px 24px',textAlign:'center' }}>
                      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
                        <Receipt size={48} color="var(--crm-muted)" strokeWidth={1.25}/>
                        <div style={{ fontSize:15,fontWeight:600,color:'var(--crm-text)' }}>
                          {search||categoryFilter||period ? 'Ничего не найдено' : 'Расходов пока нет'}
                        </div>
                        <div style={{ fontSize:13,color:'var(--crm-muted)' }}>
                          {search||categoryFilter||period ? 'Попробуйте изменить фильтры' : 'Добавьте первый расход'}
                        </div>
                        {!search && !categoryFilter && !period && (
                          <button onClick={()=>setModalOpen(true)} style={{ marginTop:4,height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
                            <Plus size={14} strokeWidth={2.5}/>Добавить расход
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((exp, i) => (
                  <tr key={exp.id} style={{ borderBottom:i<filtered.length-1?'1px solid var(--crm-border)':'none',transition:'background 0.12s',cursor:'pointer' }}
                    onClick={() => setEditingExpense(exp)}
                    onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'var(--crm-muted)' }}>{i+1}</td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:500,color:'var(--crm-text)',whiteSpace:'nowrap' }}>{exp.name}</td>
                    <td style={{ padding:'12px 14px' }}><CategoryBadge category={exp.category}/></td>
                    <td style={{ padding:'12px 14px',fontSize:13,fontWeight:700,color:'var(--crm-red)',whiteSpace:'nowrap' }}>
                      <SensitiveValue>−{formatMoney(exp.amount)}</SensitiveValue>
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                      {formatDate(exp.date)}
                    </td>
                    <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)' }}>{exp.comment ?? '—'}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6 }}>
                        <ActionButton icon={Pencil} title="Редактировать" onClick={()=>setEditingExpense(exp)}/>
                        <ActionButton icon={Trash2} title="Удалить" danger onClick={()=>setDeletingExpense(exp)}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div style={{ padding:'14px 16px',borderTop:'1px solid var(--crm-border2)' }}>
              <span style={{ fontSize:13,color:'var(--crm-muted)' }}>
                Показано {filtered.length} из {expenses.length} расходов
              </span>
            </div>
          )}
        </div>
      </div>

      <CreateExpenseModal open={modalOpen} onClose={()=>setModalOpen(false)} onSuccess={()=>loadExpenses(true)}/>
      <EditExpenseModal
        open={editingExpense !== null}
        onClose={()=>setEditingExpense(null)}
        expense={editingExpense}
        onSuccess={()=>{ setEditingExpense(null); loadExpenses(true) }}
      />
      <ConfirmDialog
        open={deletingExpense !== null}
        title={deletingExpense ? `Удалить расход «${deletingExpense.name}»?` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  )
}
