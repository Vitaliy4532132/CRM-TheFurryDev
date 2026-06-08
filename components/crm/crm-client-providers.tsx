'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getOrders, getClients, getPayments, getServices } from '@/lib/crm/api'

// ── Prefetch ──────────────────────────────────────────────────────────────────
// Загружает основные данные в кеш сразу при входе в CRM.
// Все последующие страницы получат данные мгновенно (из кеша 30 с).

function DataPrefetcher() {
  useEffect(() => {
    Promise.all([
      getOrders(),
      getClients(),
      getPayments(),
      getServices(),
    ]).catch(() => {}) // ошибки prefetch игнорируем — страницы загрузят сами
  }, [])
  return null
}

// ── Navigation loader ─────────────────────────────────────────────────────────
// Тонкая полоска сверху при переходах между страницами.

function NavigationLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 350)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'var(--crm-blue)',
        zIndex: 9999,
        animation: 'crm-progress 0.35s ease-out forwards',
        pointerEvents: 'none',
      }}
    />
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export function CRMClientProviders() {
  return (
    <>
      <DataPrefetcher />
      <NavigationLoader />
    </>
  )
}
