// ─── Labels ──────────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new:             'Новый',
  discussion:      'В обсуждении',
  waiting_payment: 'Ожидает оплату',
  in_progress:     'В работе',
  review:          'На проверке',
  revision:        'Правки',
  done:            'Готово',
  completed:       'Завершён',
  cancelled:       'Отменён',
}

/** Maps Russian display label → English DB key */
export const ORDER_STATUS_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => [v, k])
)

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card_ua:    '🇺🇦 Карта UA',
  card_ru:    '🇷🇺 Карта RU',
  card_eu:    '🇪🇺 Карта EU',
  card_other: '🌍 Карта (другая)',
  // legacy
  card:       'Карта',
  transfer:   'Перевод',
  crypto:     'Крипта',
  paypal:     'PayPal',
  other:      'Другое',
}

/** Maps Russian display label → English DB key (used in payment modal) */
export const PAYMENT_METHOD_TO_DB: Record<string, string> = {
  'Перевод': 'transfer',
  'Крипта':  'crypto',
  'PayPal':  'paypal',
  'Другое':  'other',
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ads:        'Реклама',
  hosting:    'Хостинг',
  domain:     'Домен',
  plugins:    'Плагины',
  salary:     'Зарплата/выплаты',
  commission: 'Комиссии',
  refund:     'Возврат',
  other:      'Другое',
}

// ─── Status colors ────────────────────────────────────────────────────────────

export const ORDER_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:             { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  discussion:      { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  waiting_payment: { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  in_progress:     { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  review:          { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  revision:        { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  done:            { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
  completed:       { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  cancelled:       { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatMoney(amount: number): string {
  return amount.toLocaleString('ru-RU') + ' ₽'
}

export function formatDate(iso: string): string {
  // DATE-колонки приходят как 'YYYY-MM-DD' — парсим вручную,
  // иначе new Date() даст UTC-полночь и сдвинет день в западных таймзонах
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}.${m[2]}.${m[1]}`
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

// ─── Payment status ───────────────────────────────────────────────────────────

export function getPaymentStatus(
  amount: number,
  paid: number,
): { label: string; color: string } {
  if (paid <= 0)      return { label: 'Не оплачен', color: 'var(--crm-red)' }
  if (paid >= amount) return { label: 'Оплачен',    color: 'var(--crm-green)' }
  return {
    label: `${paid.toLocaleString('ru-RU')} / ${amount.toLocaleString('ru-RU')} ₽`,
    color: 'var(--crm-orange)',
  }
}

// ─── Deadline color ───────────────────────────────────────────────────────────

export function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return 'var(--crm-muted)'
  const days = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0)  return 'var(--crm-red)'
  if (days <= 3) return 'var(--crm-yellow)'
  return 'var(--crm-muted)'
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return '—'
  return formatDate(deadline)
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export function getDateRange(period: string): { from: Date; to: Date } {
  const to   = new Date()
  const from = new Date()
  switch (period) {
    case '7d':  from.setDate(from.getDate() - 7);           break
    case '30d': from.setDate(from.getDate() - 30);          break
    case '3m':  from.setMonth(from.getMonth() - 3);         break
    case '6m':  from.setMonth(from.getMonth() - 6);         break
    case '1y':  from.setFullYear(from.getFullYear() - 1);   break
    case 'all': from.setFullYear(2020);                     break
  }
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

export function getPrevDateRange(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime()
  return {
    from: new Date(from.getTime() - duration),
    to:   new Date(from.getTime()),
  }
}

export function getGrouping(period: string): 'day' | 'week' | 'month' {
  if (period === '7d' || period === '30d') return 'day'
  if (period === '3m')                    return 'week'
  return 'month'
}

export function getBucketLabel(date: Date, grouping: 'day' | 'week' | 'month'): string {
  if (grouping === 'day') {
    return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}`
  }
  if (grouping === 'week') {
    const d   = new Date(date)
    const jan4 = new Date(d.getFullYear(), 0, 4)
    const week = Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() || 7) - 1)) / 7
    ) + 1
    return `Нед ${week}`
  }
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
}

// ─── Preferred payment ────────────────────────────────────────────────────────

export function getPreferredPayment(
  payments: import('@/types/crm').CRMPayment[]
): { method: string | null; bank: string | null } {
  if (!payments.length) return { method: null, bank: null }

  const counts: Record<string, number> = {}
  payments.forEach(p => {
    if (p.payment_method) {
      counts[p.payment_method] = (counts[p.payment_method] || 0) + 1
    }
  })

  const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]
  if (!top || top[1] < 2) return { method: null, bank: null }

  const preferredMethod = top[0]

  // Try to extract bank from comment of most recent payment with this method
  const last = [...payments]
    .filter(p => p.payment_method === preferredMethod)
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]

  let bank: string | null = null
  if (last?.comment) {
    const parts = last.comment.split(' | ')
    if (parts.length >= 2) bank = parts[0]
  }

  return { method: preferredMethod, bank }
}

export function getBucketMs(date: Date, grouping: 'day' | 'week' | 'month'): number {
  const d = new Date(date)
  if (grouping === 'day')   { d.setHours(0,0,0,0); return d.getTime() }
  if (grouping === 'week')  {
    const day  = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    d.setHours(0,0,0,0); return d.getTime()
  }
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}
