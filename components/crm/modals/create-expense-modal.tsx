'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { createCRMExpense } from '@/lib/crm/api'
import type { ExpenseCategory } from '@/types/crm'

interface CreateExpenseModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// Рус → Eng маппинг категорий
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

const EMPTY = { name: '', categoryRu: 'Хостинг', amount: '', date: '', comment: '' }

export function CreateExpenseModal({ open, onClose, onSuccess }: CreateExpenseModalProps) {
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] })
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Укажите название расхода'); return }
    const num = parseInt(form.amount, 10)
    if (!num || num <= 0) { setError('Укажите корректную сумму'); return }
    setLoading(true); setError(null)
    try {
      await createCRMExpense({
        name:     form.name.trim(),
        category: CATEGORY_MAP[form.categoryRu] ?? 'other',
        amount:   num,
        date:     form.date || new Date().toISOString().split('T')[0],
        comment:  form.comment.trim() || null,
      })
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось добавить расход')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={(e) => { if (e.target===e.currentTarget) onClose() }}
    >
      <div style={{ width:480,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Добавить расход</span>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="НАЗВАНИЕ РАСХОДА">
            <input type="text" placeholder="Название расхода" value={form.name} onChange={set('name')} style={fs} onFocus={fb} onBlur={ub}/>
          </F>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="КАТЕГОРИЯ">
              <select value={form.categoryRu} onChange={set('categoryRu')} style={fs} onFocus={fb} onBlur={ub}>
                {CATEGORIES_RU.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="СУММА (₽)">
              <input type="number" placeholder="0" min={1} value={form.amount} onChange={set('amount')} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          <F label="ДАТА">
            <input type="date" value={form.date} onChange={set('date')} style={{...fs,colorScheme:'dark'}} onFocus={fb} onBlur={ub}/>
          </F>

          <F label="КОММЕНТАРИЙ">
            <textarea placeholder="Комментарий..." value={form.comment} onChange={set('comment')} style={ta} onFocus={fb} onBlur={ub}/>
          </F>

          {error && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
              <AlertCircle size={14} strokeWidth={2}/>{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button onClick={onClose} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading && <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
            {loading ? 'Добавляем...' : 'Добавить'}
          </button>
        </div>

        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
