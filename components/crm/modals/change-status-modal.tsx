'use client'

import { X, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateCRMOrder } from '@/lib/crm/api'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TO_DB } from '@/lib/crm/helpers'

interface ChangeStatusModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  orderId: string | null
  currentStatus?: string   // English DB value
}

const STATUSES_RU = [
  'Новый', 'В обсуждении', 'Ожидает оплату', 'В работе',
  'На проверке', 'Правки', 'Готово', 'Завершён', 'Отменён',
]

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)', fontSize: 13,
  padding: '0 12px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export function ChangeStatusModal({
  open, onClose, onSuccess, orderId, currentStatus = 'new',
}: ChangeStatusModalProps) {
  // Держим в state русское отображение
  const [statusRu, setStatusRu] = useState(
    () => ORDER_STATUS_LABELS[currentStatus] ?? 'Новый'
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStatusRu(ORDER_STATUS_LABELS[currentStatus] ?? 'Новый')
  }, [currentStatus])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  async function handleSave() {
    if (!orderId) return
    const dbStatus = ORDER_STATUS_TO_DB[statusRu]
    if (!dbStatus) return
    setLoading(true)
    try {
      await updateCRMOrder(orderId, { status: dbStatus as import('@/types/crm').OrderStatus })
      onSuccess()
      onClose()
    } catch (e) {
      console.error('Change status error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ width:360,background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',borderBottom:'1px solid var(--crm-border2)' }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Изменить статус</span>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:7,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={14} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'18px 20px' }}>
          <label style={{ fontSize:12,fontWeight:600,color:'var(--crm-muted)',marginBottom:8,display:'block',letterSpacing:'0.04em' }}>СТАТУС ЗАКАЗА</label>
          <select
            value={statusRu}
            onChange={(e) => setStatusRu(e.target.value)}
            style={fieldStyle}
            onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
            onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}
          >
            {STATUSES_RU.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 20px',borderTop:'1px solid var(--crm-border2)' }}>
          <button onClick={onClose} disabled={loading} style={{ height:34,padding:'0 16px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSave} disabled={loading} style={{ height:34,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:6,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading && <Loader2 size={13} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
            Сохранить
          </button>
        </div>

        <style>{`
          select option{background:var(--crm-s3);color:var(--crm-text)}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </div>
    </div>
  )
}
