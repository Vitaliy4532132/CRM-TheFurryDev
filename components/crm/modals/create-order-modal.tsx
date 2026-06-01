'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, CreditCard } from 'lucide-react'
import { createCRMOrder, createCRMPayment } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import { ComboboxClient } from '@/components/crm/combobox-client'
import { ORDER_STATUS_TO_DB } from '@/lib/crm/helpers'
import type { CRMClient, CRMService, PaymentMethod } from '@/types/crm'

interface CreateOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
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

const BANK_PLACEHOLDER: Record<string, string> = {
  card_ua:    'Monobank, PrivatBank, ПУМБ...',
  card_ru:    'Сбербанк, Тинькофф, Альфа...',
  card_eu:    'Wise, Revolut, N26...',
  card_other: 'Название банка или сервиса...',
}

const EMPTY = {
  clientId:    null as string | null,
  serviceId:   '',
  projectName: '',
  description: '',
  amount:      '',
  paid:        '',
  deadline:    '',
  statusRu:    'Новый',
  comment:     '',
}

export function CreateOrderModal({
  open, onClose, onSuccess, clients, services, onClientCreated,
}: CreateOrderModalProps) {
  const [form,          setForm]          = useState(EMPTY)
  const [paymentMethod, setPaymentMethod] = useState('')
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [cardRegion,       setCardRegion]       = useState('')
  const [bankName,         setBankName]         = useState('')
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setPaymentMethod('')
      setCardRegion('')
      setBankName('')
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const set = <K extends keyof typeof EMPTY>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const hasPaid = Number(form.paid) > 0

  async function handleSubmit() {
    if (!form.clientId)            { setError('Выберите клиента'); return }
    if (!form.projectName.trim())  { setError('Укажите название проекта'); return }
    setLoading(true); setError(null)
    try {
      const dbStatus = ORDER_STATUS_TO_DB[form.statusRu] ?? 'new'
      const newOrder = await createCRMOrder({
        client_id:    form.clientId,
        service_id:   form.serviceId || null,
        project_name: form.projectName.trim(),
        description:  form.description.trim() || null,
        amount:       parseInt(form.amount || '0', 10),
        paid:         parseInt(form.paid   || '0', 10),
        deadline:     form.deadline || null,
        status:       dbStatus as import('@/types/crm').OrderStatus,
        comment:      form.comment.trim() || null,
      })

      // Auto-create payment if paid > 0
      if (hasPaid && newOrder?.id) {
        const finalMethod: PaymentMethod = paymentMethod === 'card'
          ? (cardRegion || 'card_other') as PaymentMethod
          : (paymentMethod || 'other') as PaymentMethod

        const paymentComment = bankName.trim()
          ? bankName.trim() + (form.comment.trim() ? ' | ' + form.comment.trim() : '')
          : form.comment.trim() || null

        await createCRMPayment({
          order_id:       newOrder.id,
          client_id:      form.clientId,
          amount:         parseInt(form.paid, 10),
          payment_method: finalMethod,
          payment_date:   new Date().toISOString().split('T')[0],
          comment:        paymentComment,
        })
      }

      onSuccess()
      onClose()
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
      onClick={(e) => { if (e.target===e.currentTarget) handleClose({ ...form, paymentMethod, cardRegion, bankName }, onClose) }}
    >
      <div style={{ width:560,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Создать заказ</span>
          <button onClick={() => handleClose({ ...form, paymentMethod, cardRegion, bankName }, onClose)} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>

          {/* Клиент + Услуга */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="КЛИЕНТ">
              <ComboboxClient
                value={form.clientId}
                onChange={id => setForm(f => ({ ...f, clientId: id }))}
                clients={clients}
                onClientCreated={onClientCreated}
              />
            </F>
            <F label="УСЛУГА">
              <select value={form.serviceId} onChange={set('serviceId')} style={fs} onFocus={fb} onBlur={ub}>
                <option value="">— без услуги —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
          </div>

          <F label="НАЗВАНИЕ ПРОЕКТА">
            <input type="text" placeholder="Название проекта" value={form.projectName} onChange={set('projectName')} style={fs} onFocus={fb} onBlur={ub}/>
          </F>

          <F label="ОПИСАНИЕ">
            <textarea placeholder="Описание заказа..." value={form.description} onChange={set('description')} style={ta} onFocus={fb} onBlur={ub}/>
          </F>

          {/* Сумма + Оплачено */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="СУММА ЗАКАЗА (₽)">
              <input type="number" placeholder="0" min={0} value={form.amount} onChange={set('amount')} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="ОПЛАЧЕНО (₽)">
              <input type="number" placeholder="0" min={0} value={form.paid} onChange={set('paid')} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          {/* Способ оплаты — появляется когда paid > 0 */}
          {hasPaid && (
            <div style={{
              background: 'var(--crm-s3)',
              border: '1px solid var(--crm-border2)',
              borderRadius: 8, padding: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
              animation: 'crm-fadeIn 0.2s ease',
            }}>
              {/* Заголовок */}
              <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600,color:'var(--crm-muted)',textTransform:'uppercase',letterSpacing:'0.06em' }}>
                <CreditCard size={12} strokeWidth={2}/>
                Способ оплаты
              </div>

              {/* Тип */}
              <select
                value={paymentMethod}
                onChange={e => { setPaymentMethod(e.target.value); setCardRegion(''); setBankName('') }}
                style={fs}
                onFocus={fb} onBlur={ub}
              >
                <option value="">Выберите способ...</option>
                <option value="card">Карта</option>
                <option value="transfer">Перевод</option>
                <option value="crypto">Крипта</option>
                <option value="paypal">PayPal</option>
                <option value="other">Другое</option>
              </select>

              {/* Регион карты */}
              {paymentMethod === 'card' && (
                <select
                  value={cardRegion}
                  onChange={e => { setCardRegion(e.target.value); setBankName('') }}
                  style={fs}
                  onFocus={fb} onBlur={ub}
                >
                  <option value="">Страна карты...</option>
                  <option value="card_ua">🇺🇦 Украина</option>
                  <option value="card_ru">🇷🇺 Россия</option>
                  <option value="card_eu">🇪🇺 Европа</option>
                  <option value="card_other">🌍 Другая</option>
                </select>
              )}

              {/* Банк */}
              {paymentMethod === 'card' && cardRegion && (
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder={BANK_PLACEHOLDER[cardRegion] ?? 'Название банка или сервиса...'}
                  style={fs}
                  onFocus={fb} onBlur={ub}
                />
              )}
            </div>
          )}

          {/* Дедлайн + Статус */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="ДЕДЛАЙН">
              <input type="date" value={form.deadline} onChange={set('deadline')} style={{...fs,colorScheme:'dark'}} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="СТАТУС">
              <select value={form.statusRu} onChange={set('statusRu')} style={fs} onFocus={fb} onBlur={ub}>
                {STATUSES_RU.map(s => <option key={s}>{s}</option>)}
              </select>
            </F>
          </div>

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
          <button onClick={() => handleClose({ ...form, paymentMethod, cardRegion, bankName }, onClose)} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading && <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
            {loading ? 'Создаём...' : 'Создать заказ'}
          </button>
        </div>

        <style>{`
          select option { background: var(--crm-s3); color: var(--crm-text); }
          input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes crm-fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}
