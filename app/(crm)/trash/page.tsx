'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RotateCcw, ExternalLink, ArrowLeftRight } from 'lucide-react'
import { getDeletedTransactions, restoreCRMPayment, restoreCRMExpense } from '@/lib/crm/api'
import type { DeletedItem } from '@/lib/crm/api'
import { formatMoney, formatDate } from '@/lib/crm/helpers'
import { EXPENSE_CATEGORY_LABELS } from '@/types/crm'
import { ConfirmDialog } from '@/components/crm/confirm-dialog'
import { toast } from '@/components/crm/toast'

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--crm-border)' }}>
      {[80, 140, 110, 90, 80, 70].map((w, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div style={{ height: 13, width: w, background: 'var(--crm-s3)', borderRadius: 6, animation: 'crm-pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  )
}

const thStyle: React.CSSProperties = {
  padding: '11px 14px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'var(--crm-muted)', textTransform: 'uppercase',
  borderBottom: '1px solid var(--crm-border2)', whiteSpace: 'nowrap',
}

export default function TrashPage() {
  const router = useRouter()
  const [items,     setItems]     = useState<DeletedItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [restoring, setRestoring] = useState<DeletedItem | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      setItems(await getDeletedTransactions())
    } catch {
      setError('Не удалось загрузить корзину')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function confirmRestore() {
    if (!restoring) return
    const item = restoring
    setRestoring(null)
    try {
      if (item.kind === 'payment') await restoreCRMPayment(item.id)
      else await restoreCRMExpense(item.id)
      await load(true)
      toast.success(
        'Восстановлено',
        item.order_id
          ? { label: 'Открыть заказ', onClick: () => router.push('/orders/' + item.order_id!) }
          : undefined,
      )
    } catch {
      toast.error('Не удалось восстановить')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Trash2 size={20} color="var(--crm-muted)" strokeWidth={1.75} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--crm-text)', margin: 0 }}>Корзина</h1>
      </div>

      <div style={{ fontSize: 13, color: 'var(--crm-muted)', marginTop: -10 }}>
        Удалённые платежи и расходы. Восстановление вернёт сумму в заказ.
      </div>

      {error && (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--crm-red-dim)', color: 'var(--crm-red)', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead style={{ background: 'var(--crm-s3)' }}>
              <tr>
                <th style={thStyle}>Удалено</th>
                <th style={thStyle}>Тип</th>
                <th style={thStyle}>Описание</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Сумма</th>
                <th style={thStyle}>Категория</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && [0,1,2,3].map(i => <SkeletonRow key={i} />)}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <ArrowLeftRight size={40} color="var(--crm-muted)" strokeWidth={1.25} />
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--crm-text)' }}>Корзина пуста</div>
                      <div style={{ fontSize: 13, color: 'var(--crm-muted)' }}>Удалённые транзакции появятся здесь</div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && items.map((item, i) => {
                const isLast = i === items.length - 1
                const isPayment = item.kind === 'payment'
                return (
                  <tr
                    key={item.kind + item.id}
                    style={{ borderBottom: isLast ? 'none' : '1px solid var(--crm-border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-surface-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Дата удаления */}
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, color: 'var(--crm-text)' }}>{formatDate(item.deleted_at)}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 2 }}>
                        {(() => {
                          const d = new Date(item.deleted_at)
                          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                        })()}
                      </div>
                    </td>

                    {/* Тип */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                        color:      isPayment ? 'var(--crm-blue)'   : 'var(--crm-orange)',
                        background: isPayment ? 'var(--crm-blue-dim)' : 'var(--crm-orange-dim)',
                      }}>
                        {isPayment ? 'Платёж' : 'Расход'}
                      </span>
                    </td>

                    {/* Описание */}
                    <td style={{ padding: '11px 14px', minWidth: 160 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text)' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--crm-muted)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subtitle}
                      </div>
                    </td>

                    {/* Сумма */}
                    <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: isPayment ? 'var(--crm-green)' : 'var(--crm-red)',
                      }}>
                        {isPayment ? '+' : '−'}{formatMoney(item.amount)}
                      </span>
                    </td>

                    {/* Категория/заказ */}
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--crm-muted)' }}>
                      {isPayment
                        ? (item.order_id ? 'Есть заказ' : 'Без заказа')
                        : (EXPENSE_CATEGORY_LABELS[item.subtitle as keyof typeof EXPENSE_CATEGORY_LABELS] ?? item.subtitle)
                      }
                    </td>

                    {/* Действия */}
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        <button
                          onClick={() => setRestoring(item)}
                          title="Восстановить"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            height: 28, padding: '0 10px', borderRadius: 6,
                            background: 'var(--crm-green-dim)', border: '1px solid var(--crm-green)',
                            color: 'var(--crm-green)', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <RotateCcw size={12} strokeWidth={2} />
                          Восстановить
                        </button>
                        {item.order_id && (
                          <button
                            onClick={() => router.push('/orders/' + item.order_id!)}
                            title="Открыть заказ"
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              background: 'transparent', border: 'none',
                              color: 'var(--crm-muted)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-s3)'; e.currentTarget.style.color = 'var(--crm-text)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--crm-muted)' }}
                          >
                            <ExternalLink size={13} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && items.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--crm-border2)', fontSize: 13, color: 'var(--crm-muted)' }}>
            {items.length} {items.length === 1 ? 'запись' : items.length < 5 ? 'записи' : 'записей'} в корзине
          </div>
        )}
      </div>

      <ConfirmDialog
        open={restoring !== null}
        title="Восстановить транзакцию?"
        description={restoring?.kind === 'payment'
          ? 'Сумма будет добавлена обратно в оплаченное по заказу.'
          : 'Расход появится в списке снова.'}
        onConfirm={confirmRestore}
        onCancel={() => setRestoring(null)}
      />
    </div>
  )
}
