import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor: string
  iconBg: string
  valueColor?: string
  sub?: string
  delta?: string
  deltaPositive?: boolean
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  valueColor,
  sub,
  delta,
  deltaPositive,
}: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 12,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Top row: label + icon */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: 'var(--crm-muted)',
            fontWeight: 400,
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: valueColor ?? 'var(--crm-text)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      {/* Footer: sub or delta */}
      <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
        {delta && (
          <span
            style={{
              color: deltaPositive ? 'var(--crm-green)' : 'var(--crm-red)',
              fontWeight: 600,
            }}
          >
            {delta}
          </span>
        )}
        {sub && (
          <span style={{ color: 'var(--crm-muted)' }}>{sub}</span>
        )}
      </div>
    </div>
  )
}
