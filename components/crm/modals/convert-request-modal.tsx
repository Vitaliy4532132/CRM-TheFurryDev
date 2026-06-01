'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createCRMClient, createCRMOrder, updateRequestStatus } from '@/lib/crm/api'
import { ComboboxClient } from '@/components/crm/combobox-client'
import { ORDER_STATUS_TO_DB } from '@/lib/crm/helpers'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import type { CRMClient, CRMService, CRMRequest } from '@/types/crm'

interface ConvertRequestModalProps {
  open:            boolean
  onClose:         () => void
  onSuccess:       () => void
  request:         CRMRequest | null
  displayNum:      number
  clients:         CRMClient[]
  services:        CRMService[]
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

export function ConvertRequestModal({
  open, onClose, onSuccess,
  request, displayNum, clients, services, onClientCreated,
}: ConvertRequestModalProps) {
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [clientId,       setClientId]       = useState<string | null>(null)
  const [serviceId,      setServiceId]      = useState('')
  const [projectName,    setProjectName]    = useState('')
  const [amount,         setAmount]         = useState('')
  const [deadline,       setDeadline]       = useState('')
  const [statusRu,       setStatusRu]       = useState('Новый')
  const [comment,        setComment]        = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!request || !open) return
    setClientId(null)
    setProjectName(request.service ?? '')
    setAmount(request.budget > 0 ? String(request.budget) : '')
    setStatusRu('Новый')
    setComment('')
    setDeadline('')
    setError(null)
    setCreatedOrderId(null)

    const matchedService = services.find(s =>
      s.name.toLowerCase().includes((request.service ?? '').toLowerCase()) ||
      (request.service ?? '').toLowerCase().includes(s.name.toLowerCase())
    )
    setServiceId(matchedService?.id ?? '')
  }, [request, open, services])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose, loading])

  async function handleSubmit() {
    if (!request) return
    if (!projectName.trim()) { setError('Укажите название проекта'); return }
    setLoading(true); setError(null)
    try {
      let resolvedClientId = clientId
      if (!resolvedClientId) {
        const tg = request.telegram
          ? (request.telegram.startsWith('@') ? request.telegram : `@${request.telegram}`)
          : null
        const newClient = await createCRMClient({
          name:    tg ?? request.name,
          telegram: tg,
          discord:  request.discord || null,
          email:    null,
          country:  null,
          note:     `Создан из заявки #${displayNum} (${request.name})`,
        })
        resolvedClientId = newClient.id
        onClientCreated()
      }

      const dbStatus = ORDER_STATUS_TO_DB[statusRu] ?? 'new'
      const order = await createCRMOrder({
        client_id:    resolvedClientId,
        service_id:   serviceId || null,
        project_name: projectName.trim(),
        description:  request.description ?? null,
        amount:       parseInt(amount || '0', 10),
        paid:         0,
        deadline:     deadline || null,
        status:       dbStatus as import('@/types/crm').OrderStatus,
        comment:      comment.trim() || null,
      })

      await updateRequestStatus(request.id, 'converted')

      setCreatedOrderId(order.id)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать заказ')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => { if (e.target===e.currentTarget && !loading) { createdOrderId ? onClose() : handleClose({ clientId, projectName, amount, deadline, comment }, onClose) } }}
    >
      <div style={{ width:560,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Конвертировать заявку в заказ</span>
          <button onClick={() => !loading && (createdOrderId ? onClose() : handleClose({ clientId, projectName, amount, deadline, comment }, onClose))} disabled={loading} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Success */}
        {createdOrderId ? (
          <div style={{ padding:'32px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:16,textAlign:'center' }}>
            <div style={{ width:60,height:60,borderRadius:'50%',background:'var(--crm-green-dim)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <CheckCircle size={28} color="var(--crm-green)" strokeWidth={2}/>
            </div>
            <div>
              <div style={{ fontSize:16,fontWeight:700,color:'var(--crm-text)',marginBottom:6 }}>Заказ создан!</div>
              <div style={{ fontSize:13,color:'var(--crm-muted)' }}>Заявка отмечена как конвертированная</div>
            </div>
            <Link href={`/orders/${createdOrderId}`} onClick={onClose} style={{ display:'inline-flex',alignItems:'center',gap:7,height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',color:'#fff',fontSize:13,fontWeight:600,textDecoration:'none',transition:'opacity 0.15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity='0.85'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity='1'}}>
              <ExternalLink size={14} strokeWidth={2}/>Перейти к заказу
            </Link>
          </div>
        ) : (
          <>
            <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>

              {/* Инфо из заявки */}
              {request && (
                <div style={{ padding:'12px 14px',background:'var(--crm-s3)',borderRadius:8,fontSize:12,color:'var(--crm-muted)',lineHeight:1.6 }}>
                  <span style={{ fontWeight:600,color:'var(--crm-text)' }}>Заявка #{displayNum}: {request.name}</span>
                  {' '}· {request.telegram ? `@${request.telegram}` : '—'}
                  {' '}· {request.service ?? '—'}
                  {' '}· {request.budget > 0 ? `${request.budget.toLocaleString('ru-RU')} ₽` : '—'}
                </div>
              )}

              <F label="КЛИЕНТ">
                <ComboboxClient value={clientId} onChange={setClientId} clients={clients} onClientCreated={onClientCreated}/>
                {!clientId && (
                  <div style={{ fontSize:11,color:'var(--crm-muted)',marginTop:4 }}>
                    Если не выбрать — будет создан новый клиент из данных заявки
                  </div>
                )}
              </F>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="УСЛУГА">
                  <select value={serviceId} onChange={e=>setServiceId(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                    <option value="">— без услуги —</option>
                    {services.filter(s=>s.is_active).map(s=>(
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </F>
                <F label="СТАТУС">
                  <select value={statusRu} onChange={e=>setStatusRu(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                    {STATUSES_RU.map(s=><option key={s}>{s}</option>)}
                  </select>
                </F>
              </div>

              <F label="НАЗВАНИЕ ПРОЕКТА">
                <input type="text" value={projectName} onChange={e=>setProjectName(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
              </F>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="СУММА (₽)">
                  <input type="number" min={0} value={amount} onChange={e=>setAmount(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
                </F>
                <F label="ДЕДЛАЙН">
                  <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{...fs,colorScheme:'dark'}} onFocus={fb} onBlur={ub}/>
                </F>
              </div>

              <F label="КОММЕНТАРИЙ">
                <textarea placeholder="Комментарий..." value={comment} onChange={e=>setComment(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
              </F>

              {error && (
                <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
                  <AlertCircle size={14} strokeWidth={2}/>{error}
                </div>
              )}
            </div>

            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
              <button onClick={() => !loading && handleClose({ clientId, projectName, amount, deadline, comment }, onClose)} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
                Отмена
              </button>
              <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-green)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
                onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}}
                onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
                {loading
                  ? <><Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>Создаём...</>
                  : <><CheckCircle size={14} strokeWidth={2}/>Создать заказ</>
                }
              </button>
            </div>
          </>
        )}

        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}
