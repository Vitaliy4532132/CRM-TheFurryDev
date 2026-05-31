import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--crm-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'var(--crm-red-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
      }}>
        <ShieldX size={40} color="var(--crm-red)" strokeWidth={1.5} />
      </div>

      <div style={{
        fontSize: 28, fontWeight: 800,
        color: 'var(--crm-text)', letterSpacing: '-0.02em',
      }}>
        Доступ запрещён
      </div>

      <div style={{
        fontSize: 14, color: 'var(--crm-muted)',
        textAlign: 'center', maxWidth: 320, lineHeight: 1.6,
      }}>
        Эта панель доступна только владельцам TheFurryDev
      </div>

      <Link
        href="https://thefurry.store"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          marginTop: 8, height: 38, padding: '0 18px', borderRadius: 8,
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          color: 'var(--crm-text)', fontSize: 13, fontWeight: 500,
          textDecoration: 'none', transition: 'border-color 0.15s',
        }}
        className="crm-forbidden-link"
      >
        ← Вернуться на сайт
      </Link>

      <style>{`.crm-forbidden-link:hover { border-color: var(--crm-blue) !important; color: var(--crm-blue) !important; }`}</style>
    </div>
  )
}
