'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  TrendingUp,
  ArrowDownCircle,
  Layers,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  label: 'Главная',   icon: LayoutDashboard },
  { href: '/orders',     label: 'Заказы',    icon: ClipboardList },
  { href: '/clients',    label: 'Клиенты',   icon: Users },
  { href: '/requests',   label: 'Заявки',    icon: FileText },
  { href: '/finance',    label: 'Финансы',   icon: TrendingUp },
  { href: '/expenses',   label: 'Расходы',   icon: ArrowDownCircle },
  { href: '/services',   label: 'Услуги',    icon: Layers },
  { href: '/settings',   label: 'Настройки', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        background: 'var(--crm-sidebar)',
        borderRight: '1px solid var(--crm-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '18px 16px',
          borderBottom: '1px solid var(--crm-border)',
          flexShrink: 0,
        }}
      >
        {/* Icon */}
        <Image
          src="/logo.svg"
          alt="TheFurryDev"
          width={32}
          height={32}
          style={{ flexShrink: 0 }}
        />
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--crm-text)',
              lineHeight: 1.2,
            }}
          >
            TheFurryDev
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--crm-muted)',
              marginTop: 1,
            }}
          >
            CRM Studio
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--crm-blue)' : 'var(--crm-muted)',
                background: active ? 'var(--crm-blue-dim)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2,
                transition: 'background 0.15s, color 0.15s',
              }}
              className={cn('crm-nav-item', active && 'active')}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.75} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Hover styles */}
      <style>{`
        .crm-nav-item:not(.active):hover {
          background: var(--crm-surface) !important;
          color: var(--crm-text) !important;
        }
      `}</style>
    </aside>
  )
}
