'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { updateCRMOrder } from '@/lib/crm/api'
import { ComboboxClient } from '@/components/crm/combobox-client'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TO_DB } from '@/lib/crm/helpers'
import type { CRMClient, CRMService, CRMOrder } from '@/types/crm'

interface EditOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: CRMOrder | null
  clients: CRMClient[]
  services: CRMService[]
  onClientCreated: () => void
}

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

const STATUSES_RU = ['Новый','В обсуждении','Ожидает оплату','В работе','На проверке','Правки','Готово','Завершён','Отменён']

export function EditOrderModal({
  open, onClose, onSuccess, order, clients, services, onClientCreated,
}: EditOrderModalProps) {
  const [clientId,     setClientId]     = useState<string | null>(null)
  const [serviceId,    setServiceId]    = useState('')
  const [projectName,  setProjectName]  = useState('')
  const [description,  setDescription]  = useState('')
  const [amount,       setAmount]       = useState('')
  const [paid,         setPaid]         = useState('')
  const [deadline,     setDeadline]     = useState('')
  const [statusRu,     setStatusRu]     = useState('Новый')
  const [comment,      setComment]      = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Заполняем поля из заказа
  useEffect(() => {
    if (!order) return
    setClientId(order.client_id)
    setServiceId(order.service_id ?? '')
    setProjectName(order.project_name)
    setDescription(order.description ?? '')
    setAmount(String(order.amount))
    setPaid(String(order.paid))
    setDeadline(order.deadline ?? '')
    setStatusRu(ORDER_STATUS_LABELS[order.status] ?? 'Новый')
    setComment(order.comment ?? '')
    setError(null)
  }, [order])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  async function handleSubmit() {
    if (!order) return
    if (!projectName.trim()) { setError('Укажите название проекта'); return }
    setLoading(true); setError(null)
    try {
      const dbStatus = ORDER_STATUS_TO_DB[statusRu] ?? 'new'
      await updateCRMOrder(order.id, {
        client_id:    clientId,
        service_id:   serviceId || null,
        project_name: projectName.trim(),
        description:  description.trim() || null,
        amount:       parseInt(amount || '0', 10),
        paid:         parseInt(paid   || '0', 10),
        deadline:     deadline || null,
        status:       dbStatus as import('@/types/crm').OrderStatus,
        comment:      comment.trim() || null,
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
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={(e) => { if (e.target===e.currentTarget) onClose() }}
    >
      <div style={{ width:560,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>
            Редактировать заказ {order ? `#${order.order_number}` : ''}
          </span>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="КЛИЕНТ">
              <ComboboxClient
                value={clientId}
                onChange={setClientId}
                clients={clients}
                onClientCreated={onClientCreated}
              />
            </F>
            <F label="УСЛУГА">
              <select value={serviceId} onChange={e => setServiceId(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                <option value="">— без услуги —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
          </div>

          <F label="НАЗВАНИЕ ПРОЕКТА">
            <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
          </F>

          <F label="ОПИСАНИЕ">
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
          </F>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="СУММА ЗАКАЗА (₽)">
              <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="ОПЛАЧЕНО (₽)">
              <input type="number" min={0} value={paid} onChange={e => setPaid(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="ДЕДЛАЙН">
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{...fs,colorScheme:'dark'}} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="СТАТУС">
              <select value={statusRu} onChange={e => setStatusRu(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                {STATUSES_RU.map(s => <option key={s}>{s}</option>)}
              </select>
            </F>
          </div>

          <F label="КОММЕНТАРИЙ">
            <textarea value={comment} onChange={e => setComment(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
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
            {loading ? 'Сохраняем...' : 'Сохранить'}
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
