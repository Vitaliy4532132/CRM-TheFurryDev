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
