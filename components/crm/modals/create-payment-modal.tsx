'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { createCRMPayment } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import type { CRMOrder, PaymentMethod } from '@/types/crm'

interface CreatePaymentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (amount: number) => void
  orderId?: string | null
  clientId?: string | null
  orderLabel?: string
  clientLabel?: string
  orders?: CRMOrder[]
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

const PAY_TYPES   = ['Карта', 'Перевод', 'Крипта', 'PayPal', 'Другое']
const CARD_TYPES  = [
  { key: 'ua',    label: '🇺🇦 Украина (Monobank, PrivatBank...)' },
  { key: 'ru',    label: '🇷🇺 Россия (Сбер, Тинькофф...)' },
  { key: 'eu',    label: '🇪🇺 Европа (Wise, Revolut...)' },
  { key: 'other', label: '🌍 Другая страна' },
]
const BANK_PLACEHOLDER: Record<string, string> = {
  ua:    'Monobank, PrivatBank, ПУМБ...',
  ru:    'Сбербанк, Тинькофф, Альфа...',
  eu:    'Wise, Revolut, N26...',
  other: 'Название банка / сервиса',
}
const PAY_TYPE_TO_METHOD: Record<string, PaymentMethod> = {
  'Перевод': 'transfer',
  'Крипта':  'crypto',
  'PayPal':  'paypal',
  'Другое':  'other',
}

function resolveMethod(payType: string, cardType: string): PaymentMethod {
  if (payType === 'Карта') {
    if (cardType === 'ua')    return 'card_ua'
    if (cardType === 'ru')    return 'card_ru'
    if (cardType === 'eu')    return 'card_eu'
    return 'card_other'
  }
  return PAY_TYPE_TO_METHOD[payType] ?? 'other'
}

export function CreatePaymentModal({
  open, onClose, onSuccess,
  orderId = null, clientId = null,
  orderLabel = '', clientLabel = '',
  orders,
}: CreatePaymentModalProps) {
  const selectMode = !!orders && !orderId

  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [amount,    setAmount]    = useState('')
  const [payType,   setPayType]   = useState('Карта')
  const [cardType,  setCardType]  = useState('ua')
  const [bank,      setBank]      = useState('')
  const [date,      setDate]      = useState('')
  const [comment,   setComment]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedOrderId(''); setAmount('')
      setPayType('Карта'); setCardType('ua'); setBank('')
      setDate(new Date().toISOString().split('T')[0])
      setComment(''); setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const selectedOrder   = selectMode ? (orders?.find(o => o.id === selectedOrderId) ?? null) : null
  const effectiveOrderId  = orderId ?? (selectMode ? selectedOrderId : null)
  const effectiveClientId = clientId ?? selectedOrder?.client_id ?? null
  const effectiveLabel    = orderLabel || (selectedOrder ? `#${selectedOrder.order_number} — ${selectedOrder.project_name}` : '')
  const effectiveClient   = clientLabel || selectedOrder?.client?.name || ''

  function buildComment(): string | null {
    const bankPart    = bank.trim()
    const commentPart = comment.trim()
    if (bankPart && commentPart) return `${bankPart} | ${commentPart}`
    if (bankPart)                return bankPart
    if (commentPart)             return commentPart
    return null
  }

  async function handleSubmit() {
    if (selectMode && !selectedOrderId) { setError('Выберите заказ'); return }
    const num = parseInt(amount, 10)
    if (!num || num <= 0) { setError('Укажите сумму платежа'); return }
    setLoading(true); setError(null)
    try {
      const method = resolveMethod(payType, cardType)
      // Trigger recalculate_order_paid handles paid update automatically
      await createCRMPayment({
        order_id:       effectiveOrderId,
        client_id:      effectiveClientId,
        amount:         num,
        payment_method: method,
        payment_date:   date || new Date().toISOString().split('T')[0],
        comment:        buildComment(),
      })
      onSuccess(num)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось добавить платёж')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={(e) => { if (e.target===e.currentTarget) handleClose({ selectedOrderId, amount, bank, comment }, onClose) }}
    >
      <div style={{ width:480,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Добавить платёж</span>
          <button onClick={() => handleClose({ selectedOrderId, amount, bank, comment }, onClose)} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>

          {/* Заказ / Клиент */}
          {selectMode ? (
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <F label="ЗАКАЗ">
                <select value={selectedOrderId} onChange={e=>setSelectedOrderId(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                  <option value="">Выберите заказ</option>
                  {orders?.map(o => (
                    <option key={o.id} value={o.id}>
                      #{o.order_number} — {o.project_name}{o.client?.name ? ` (${o.client.name})` : ''}
                    </option>
                  ))}
                </select>
              </F>
              <F label="КЛИЕНТ">
                <div style={{ ...fs,display:'flex',alignItems:'center',color:effectiveClient?'var(--crm-text)':'var(--crm-muted)',fontStyle:effectiveClient?'normal':'italic' }}>
                  {effectiveClient || 'автозаполнение'}
                </div>
              </F>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <F label="ЗАКАЗ">
                <div style={{ ...fs,display:'flex',alignItems:'center',color:effectiveLabel?'var(--crm-text)':'var(--crm-muted)' }}>{effectiveLabel||'—'}</div>
              </F>
              <F label="КЛИЕНТ">
                <div style={{ ...fs,display:'flex',alignItems:'center',color:effectiveClient?'var(--crm-text)':'var(--crm-muted)' }}>{effectiveClient||'—'}</div>
              </F>
            </div>
          )}

          {/* Сумма */}
          <F label="СУММА ОПЛАТЫ (₽)">
            <input type="number" placeholder="0" min={1} value={amount} onChange={e=>setAmount(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
          </F>

          {/* Способ оплаты — Шаг 1 */}
          <F label="СПОСОБ ОПЛАТЫ">
            <select value={payType} onChange={e=>{setPayType(e.target.value);setBank('')}} style={fs} onFocus={fb} onBlur={ub}>
              {PAY_TYPES.map(m=><option key={m}>{m}</option>)}
            </select>
          </F>

          {/* Карта — Шаг 2 */}
          {payType === 'Карта' && (
            <div style={{ display:'flex',flexDirection:'column',gap:10,padding:'14px 16px',background:'var(--crm-s3)',borderRadius:10,border:'1px solid var(--crm-border)' }}>
              <F label="СТРАНА КАРТЫ">
                <select value={cardType} onChange={e=>{setCardType(e.target.value);setBank('')}} style={fs} onFocus={fb} onBlur={ub}>
                  {CARD_TYPES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </F>
              <F label="БАНК / СЕРВИС (НЕОБЯЗАТЕЛЬНО)">
                <input
                  type="text"
                  placeholder={BANK_PLACEHOLDER[cardType] ?? 'Название банка'}
                  value={bank}
                  onChange={e=>setBank(e.target.value)}
                  style={fs}
                  onFocus={fb} onBlur={ub}
                />
              </F>
            </div>
          )}

          {/* Дата */}
          <F label="ДАТА ОПЛАТЫ">
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...fs,colorScheme:'dark'}} onFocus={fb} onBlur={ub}/>
          </F>

          {/* Комментарий */}
          <F label="КОММЕНТАРИЙ">
            <textarea placeholder="Комментарий..." value={comment} onChange={e=>setComment(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
          </F>

          {error && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
              <AlertCircle size={14} strokeWidth={2}/>{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button onClick={() => handleClose({ selectedOrderId, amount, bank, comment }, onClose)} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading && <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
            {loading ? 'Добавляем...' : 'Добавить платёж'}
          </button>
        </div>

        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}
