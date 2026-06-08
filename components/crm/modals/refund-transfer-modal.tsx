'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, ArrowLeftRight, RotateCcw, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { updateCRMOrder, createCRMExpense, createCRMPayment } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import { formatMoney } from '@/lib/crm/helpers'
import type { CRMClient, CRMOrder } from '@/types/crm'

interface RefundTransferModalProps {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  client:    CRMClient
  orders:    CRMOrder[]
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
  return <div style={{ display: 'flex', flexDirection: 'column' }}><label style={lb}>{label}</label>{children}</div>
}
function fb(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)' }
function ub(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)' }

export function RefundTransferModal({ open, onClose, onSuccess, client, orders }: RefundTransferModalProps) {
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [action, setAction] = useState<'refund' | 'transfer'>('refund')

  // Refund
  const [fromOrderId,   setFromOrderId]   = useState('')
  const [refundAmount,  setRefundAmount]  = useState('')
  const [refundComment, setRefundComment] = useState('')

  // Transfer
  const [transferFromId,      setTransferFromId]      = useState('')
  const [transferToId,        setTransferToId]        = useState('')
  const [transferAmount,      setTransferAmount]      = useState('')
  const [transferComment,     setTransferComment]     = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<{ message: string; orderNum?: number; orderId?: string } | null>(null)

  useEffect(() => {
    if (open) {
      setAction('refund')
      setFromOrderId(''); setRefundAmount(''); setRefundComment('')
      setTransferFromId(''); setTransferToId(''); setTransferAmount(''); setTransferComment('')
      setLoading(false); setError(null); setSuccess(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) success ? onClose() : undefined }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose, loading, success])

  const paidOrders    = orders.filter(o => o.paid > 0)
  const fromOrder     = orders.find(o => o.id === fromOrderId)
  const tfFromOrder   = orders.find(o => o.id === transferFromId)
  const tfToOrder     = orders.find(o => o.id === transferToId)
  const tfToOrders    = orders.filter(o => o.id !== transferFromId)

  async function handleRefund() {
    if (!fromOrderId) { setError('Выберите заказ'); return }
    const num = parseInt(refundAmount, 10)
    if (!num || num <= 0) { setError('Укажите сумму возврата'); return }
    if (fromOrder && num > fromOrder.paid) {
      setError(`Сумма превышает оплаченное (${formatMoney(fromOrder.paid)})`); return
    }
    setLoading(true); setError(null)
    try {
      await updateCRMOrder(fromOrderId, { paid: (fromOrder?.paid ?? 0) - num })
      await createCRMExpense({
        name:     `Возврат клиенту ${client.name}`,
        category: 'refund',
        amount:   num,
        date:     new Date().toISOString().split('T')[0],
        comment:  refundComment.trim() || null,
      })
      setSuccess({ message: 'Возврат оформлен' })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось оформить возврат')
    } finally {
      setLoading(false)
    }
  }

  async function handleTransfer() {
    if (!transferFromId) { setError('Выберите заказ-источник'); return }
    if (!transferToId)   { setError('Выберите заказ-назначение'); return }
    if (transferFromId === transferToId) { setError('Нельзя перенести на тот же заказ'); return }
    const num = parseInt(transferAmount, 10)
    if (!num || num <= 0) { setError('Укажите сумму переноса'); return }
    if (tfFromOrder && num > tfFromOrder.paid) {
      setError(`Сумма превышает оплаченное (${formatMoney(tfFromOrder.paid)})`); return
    }
    setLoading(true); setError(null)
    try {
      await updateCRMOrder(transferFromId, { paid: (tfFromOrder?.paid ?? 0) - num })
      await updateCRMOrder(transferToId,   { paid: (tfToOrder?.paid ?? 0) + num })
      await createCRMPayment({
        order_id:       transferToId,
        client_id:      client.id,
        amount:         num,
        payment_method: 'transfer',
        payment_date:   new Date().toISOString().split('T')[0],
        comment:        `Перенос с заказа #${tfFromOrder?.order_number}${transferComment.trim() ? ' | ' + transferComment.trim() : ''}`,
      })
      setSuccess({
        message:  'Перенос выполнен',
        orderNum: tfToOrder?.order_number,
        orderId:  transferToId,
      })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить перенос')
    } finally {
      setLoading(false)
    }
  }

  const formFields = action === 'refund'
    ? { fromOrderId, refundAmount, refundComment }
    : { transferFromId, transferToId, transferAmount, transferComment }

  if (!open) return null

  const btnBase: React.CSSProperties = {
    padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
    width: '100%',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ width: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--crm-border2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeftRight size={16} color="var(--crm-yellow)" strokeWidth={2} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)' }}>Возврат или перенос оплаты</span>
          </div>
          <button
            onClick={() => success ? onClose() : handleClose(formFields, onClose)}
            style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--crm-s3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crm-muted)', transition: 'background 0.15s,color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-red-dim)'; e.currentTarget.style.color = 'var(--crm-red)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--crm-s3)'; e.currentTarget.style.color = 'var(--crm-muted)' }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Success */}
        {success ? (
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--crm-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} color="var(--crm-green)" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--crm-text)' }}>{success.message}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {success.orderId && (
                <Link
                  href={`/orders/${success.orderId}`}
                  onClick={onClose}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)', color: 'var(--crm-text)', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--crm-border2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--crm-s3)' }}
                >
                  <ArrowRight size={14} strokeWidth={2} />
                  Перейти к заказу #{success.orderNum}
                </Link>
              )}
              <button
                onClick={onClose}
                style={{ height: 36, padding: '0 16px', borderRadius: 8, background: 'var(--crm-blue)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Action selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={() => { setAction('refund'); setError(null) }}
                  style={{
                    ...btnBase,
                    background: action === 'refund' ? 'var(--crm-blue-dim)' : 'transparent',
                    border: action === 'refund' ? '2px solid var(--crm-blue)' : '1px solid var(--crm-border2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <RotateCcw size={14} color={action === 'refund' ? 'var(--crm-blue)' : 'var(--crm-muted)'} strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: action === 'refund' ? 'var(--crm-blue)' : 'var(--crm-text)' }}>Возврат клиенту</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--crm-muted)', lineHeight: 1.4 }}>Деньги возвращаются клиенту</div>
                </button>

                <button
                  onClick={() => { setAction('transfer'); setError(null) }}
                  style={{
                    ...btnBase,
                    background: action === 'transfer' ? 'var(--crm-blue-dim)' : 'transparent',
                    border: action === 'transfer' ? '2px solid var(--crm-blue)' : '1px solid var(--crm-border2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <ArrowRight size={14} color={action === 'transfer' ? 'var(--crm-blue)' : 'var(--crm-muted)'} strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: action === 'transfer' ? 'var(--crm-blue)' : 'var(--crm-text)' }}>Перенос на другой заказ</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--crm-muted)', lineHeight: 1.4 }}>С одного заказа на другой</div>
                </button>
              </div>

              {/* Refund form */}
              {action === 'refund' && (
                <>
                  <F label="ЗАКАЗ">
                    <select value={fromOrderId} onChange={e => setFromOrderId(e.target.value)} style={fs} onFocus={fb} onBlur={ub}>
                      <option value="">Выберите заказ...</option>
                      {paidOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          #{o.order_number} — {o.project_name} | Оплачено: {formatMoney(o.paid)}
                        </option>
                      ))}
                    </select>
                    {paidOrders.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 4 }}>Нет заказов с оплатами</div>
                    )}
                  </F>

                  <F label="СУММА ВОЗВРАТА (₽)">
                    <input
                      type="number" min={1}
                      max={fromOrder?.paid ?? undefined}
                      placeholder="0"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      style={fs} onFocus={fb} onBlur={ub}
                    />
                    {fromOrder && (
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 4 }}>
                        Максимум: {formatMoney(fromOrder.paid)}
                      </div>
                    )}
                  </F>

                  <F label="ПРИЧИНА ВОЗВРАТА (НЕОБЯЗАТЕЛЬНО)">
                    <textarea
                      placeholder="Причина возврата..."
                      value={refundComment}
                      onChange={e => setRefundComment(e.target.value)}
                      style={ta} onFocus={fb} onBlur={ub}
                    />
                  </F>
                </>
              )}

              {/* Transfer form */}
              {action === 'transfer' && (
                <>
                  <F label="ОТКУДА">
                    <select
                      value={transferFromId}
                      onChange={e => { setTransferFromId(e.target.value); setTransferToId('') }}
                      style={fs} onFocus={fb} onBlur={ub}
                    >
                      <option value="">Выберите заказ-источник...</option>
                      {paidOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          #{o.order_number} — {o.project_name} | Оплачено: {formatMoney(o.paid)}
                        </option>
                      ))}
                    </select>
                    {paidOrders.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 4 }}>Нет заказов с оплатами</div>
                    )}
                  </F>

                  <F label="СУММА ПЕРЕНОСА (₽)">
                    <input
                      type="number" min={1}
                      max={tfFromOrder?.paid ?? undefined}
                      placeholder="0"
                      value={transferAmount}
                      onChange={e => setTransferAmount(e.target.value)}
                      style={fs} onFocus={fb} onBlur={ub}
                    />
                    {tfFromOrder && (
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 4 }}>
                        Максимум: {formatMoney(tfFromOrder.paid)}
                      </div>
                    )}
                  </F>

                  <F label="КУДА">
                    <select
                      value={transferToId}
                      onChange={e => setTransferToId(e.target.value)}
                      style={{ ...fs, opacity: !transferFromId ? 0.5 : 1 }}
                      disabled={!transferFromId}
                      onFocus={fb} onBlur={ub}
                    >
                      <option value="">Выберите заказ-назначение...</option>
                      {tfToOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          #{o.order_number} — {o.project_name} | Остаток: {formatMoney(Math.max(0, o.amount - o.paid))}
                        </option>
                      ))}
                    </select>
                    {!transferFromId && (
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 4 }}>Сначала выберите откуда</div>
                    )}
                  </F>

                  <F label="КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)">
                    <textarea
                      placeholder=""
                      value={transferComment}
                      onChange={e => setTransferComment(e.target.value)}
                      style={ta} onFocus={fb} onBlur={ub}
                    />
                  </F>
                </>
              )}

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--crm-red-dim)', fontSize: 13, color: 'var(--crm-red)' }}>
                  <AlertCircle size={14} strokeWidth={2} />{error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--crm-border2)', flexShrink: 0 }}>
              <button
                onClick={() => handleClose(formFields, onClose)}
                disabled={loading}
                style={{ height: 36, padding: '0 18px', borderRadius: 8, background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)', color: 'var(--crm-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s,color 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-border2)'; e.currentTarget.style.color = 'var(--crm-text)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--crm-s3)'; e.currentTarget.style.color = 'var(--crm-muted)' }}
              >
                Отмена
              </button>
              <button
                onClick={action === 'refund' ? handleRefund : handleTransfer}
                disabled={loading}
                style={{ height: 36, padding: '0 18px', borderRadius: 8, background: 'var(--crm-blue)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7, transition: 'opacity 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1' }}
              >
                {loading && <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {loading ? 'Выполняем...' : 'Подтвердить'}
              </button>
            </div>
          </>
        )}

        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose} />
    </div>
  )
}
