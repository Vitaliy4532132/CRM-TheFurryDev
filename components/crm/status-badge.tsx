type OrderStatus =
  | 'В работе'
  | 'Ожидает оплату'
  | 'Завершён'
  | 'Правки'
  | 'Готово'
  | 'На проверке'
  | 'Новый'
  | 'Отменён'
  | 'В обсуждении'

type PaymentStatus = 'Оплачен' | 'Частично' | 'Не оплачен'

type BadgeStatus = OrderStatus | PaymentStatus

const badgeConfig: Record<BadgeStatus, { color: string; bg: string }> = {
  // Order statuses
  'В работе':       { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  'Ожидает оплату': { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  'Завершён':       { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  'Правки':         { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  'Готово':         { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
  'На проверке':    { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  'Новый':          { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  'Отменён':        { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
  'В обсуждении':   { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  // Payment statuses
  'Оплачен':        { color: 'var(--crm-green)',  bg: 'var(--crm-green-dim)' },
  'Частично':       { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  'Не оплачен':     { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
}

interface StatusBadgeProps {
  status: BadgeStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = badgeConfig[status] ?? {
    color: 'var(--crm-muted)',
    bg: 'rgba(100,116,139,0.12)',
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {status}
    </span>
  )
}

export type { OrderStatus, PaymentStatus, BadgeStatus }

// ── PaymentMethodBadge ────────────────────────────────────────────────────────

const PAYMENT_METHOD_BADGE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  card_ua:    { color: '#FFD700',              bg: 'rgba(255,215,0,0.12)',       label: '🇺🇦 Карта UA' },
  card_ru:    { color: 'var(--crm-red)',       bg: 'var(--crm-red-dim)',         label: '🇷🇺 Карта RU' },
  card_eu:    { color: 'var(--crm-blue)',      bg: 'var(--crm-blue-dim)',        label: '🇪🇺 Карта EU' },
  card_other: { color: 'var(--crm-muted)',     bg: 'rgba(100,116,139,0.12)',     label: '🌍 Карта' },
  card:       { color: 'var(--crm-muted)',     bg: 'rgba(100,116,139,0.12)',     label: 'Карта' },
  transfer:   { color: 'var(--crm-teal)',      bg: 'var(--crm-teal-dim)',        label: 'Перевод' },
  crypto:     { color: 'var(--crm-yellow)',    bg: 'var(--crm-yellow-dim)',      label: 'Крипта' },
  paypal:     { color: 'var(--crm-purple)',    bg: 'var(--crm-purple-dim)',      label: 'PayPal' },
  other:      { color: 'var(--crm-muted)',     bg: 'rgba(100,116,139,0.12)',     label: 'Другое' },
}

export function PaymentMethodBadge({ method }: { method: string | null }) {
  if (!method) return <span style={{ color: 'var(--crm-muted)', fontSize: 13 }}>—</span>
  const cfg = PAYMENT_METHOD_BADGE_CFG[method] ?? PAYMENT_METHOD_BADGE_CFG.other
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}
