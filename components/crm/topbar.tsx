'use client'

import { usePathname } from 'next/navigation'
import { Search, Plus } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Главная',
  '/orders':    'Заказы',
  '/clients':   'Клиенты',
  '/requests':  'Заявки',
  '/finance':   'Финансы',
  '/expenses':  'Расходы',
  '/services':  'Услуги',
  '/settings':  'Настройки',
}

interface TopbarProps {
  userEmail?: string | null
}

export function Topbar({ userEmail }: TopbarProps) {
  const pathname = usePathname()

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key + '/'))?.[1] ??
    'CRM'

  const displayName = userEmail ? userEmail.split('@')[0] : 'Админ'

  return (
    <header
      style={{
        height: 58,
        background: 'var(--crm-sidebar)',
        borderBottom: '1px solid var(--crm-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--crm-text)',
          flex: 1,
          margin: 0,
        }}
      >
        {title}
      </h1>

      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          borderRadius: 8,
          padding: '7px 14px',
          width: 220,
          cursor: 'text',
        }}
      >
        <Search size={14} color="var(--crm-muted)" strokeWidth={1.75} />
        <span style={{ fontSize: 13, color: 'var(--crm-muted)' }}>Поиск...</span>
      </div>

      {/* Create button */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--crm-blue)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        <Plus size={15} strokeWidth={2.5} />
        Создать заказ
      </button>

      {/* User */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          borderRadius: 8,
          padding: '6px 12px',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'var(--crm-blue-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--crm-blue)',
          }}
        >
          {displayName[0]?.toUpperCase() ?? 'A'}
        </div>
        <span style={{ fontSize: 13, color: 'var(--crm-text)', fontWeight: 500 }}>
          {displayName}
        </span>
      </div>
    </header>
  )
}
