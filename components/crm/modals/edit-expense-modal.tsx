'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { updateCRMExpense } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/crm/helpers'
import type { CRMExpense, ExpenseCategory } from '@/types/crm'

interface EditExpenseModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  expense: CRMExpense | null
}

// Рус → Eng маппинг
const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  'Реклама':          'ads',
  'Хостинг':          'hosting',
  'Домен':            'domain',
  'Плагины':          'plugins',
  'Зарплата/выплаты': 'salary',
  'Комиссии':         'commission',
  'Возврат':          'refund',
  'Другое':           'other',
}
const CATEGORIES_RU = Object.keys(CATEGORY_MAP)

const fs: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)', fontSize: 13,
  padding: '0 12px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const ta: React.CSSProperties = { ...fs, height: 80, padding: '10px 12px', resize: 'vertical' }
const lb: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--crm-muted)', marginBottom: 6, display: 'block', letterSpacing: '0.04em' }

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display:'flex', flexDirection:'column' }}><label style={lb}>{label}</label>{children}</div>
}
function fb(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)' }
function ub(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)' }

export function EditExpenseModal({ open, onClose, onSuccess, expense }: EditExpenseModalProps) {
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [name,       setName]       = useState('')
  const [categoryRu, setCategoryRu] = useState('Хостинг')
  const [amount,     setAmount]     = useState('')
  const [date,       setDate]       = useState('')
  const [comment,    setComment]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Заполняем из объекта расхода
  useEffect(() => {
    if (!expense) return
    setName(expense.name)
    setCategoryRu(EXPENSE_CATEGORY_LABELS[expense.category] ?? 'Другое')
    setAmount(String(expense.amount))
    setDate(expense.date)
    setComment(expense.comment ?? '')
    setError(null)
  }, [expense])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  async function handleSubmit() {
    if (!expense) return
    if (!name.trim()) { setError('Укажите название'); return }
    const num = parseInt(amount, 10)
    if (!num || num <= 0) { setError('Укажите корректную сумму'); return }
    setLoading(true); setError(null)
    try {
      await updateCRMExpense(expense.id, {
        name:     name.trim(),
        category: CATEGORY_MAP[categoryRu] ?? 'other',
        amount:   num,
        date:     date || expense.date,
        comment:  comment.trim() || null,
      })
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить изменения')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ width:480,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Редактировать расход</span>
          <button onClick={() => handleClose({ name, amount, comment }, onClose)} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="НАЗВАНИЕ">
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
          </F>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="КАТЕГОРИЯ">
              <select value={categoryRu} onChange={e => setCategoryRu(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                {CATEGORIES_RU.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="СУММА (₽)">
              <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>
          <F label="ДАТА">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{...fs,colorScheme:'dark'}} onFocus={fb} onBlur={ub}/>
          </F>
          <F label="КОММЕНТАРИЙ">
            <textarea value={comment} onChange={e => setComment(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
          </F>

          {error && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
              <AlertCircle size={14} strokeWidth={2}/>{error}
            </div>
          )}
        </div>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button onClick={() => handleClose({ name, amount, comment }, onClose)} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading && <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
            {loading ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}
