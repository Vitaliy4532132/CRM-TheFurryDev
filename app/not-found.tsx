import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
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
      <div style={{ fontSize: 80, fontWeight: 800, color: 'var(--crm-muted)', lineHeight: 1, letterSpacing: '-0.04em' }}>
        404
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--crm-text)' }}>
        Страница не найдена
      </div>
      <div style={{ fontSize: 13, color: 'var(--crm-muted)', marginBottom: 8 }}>
        Проверьте адрес или вернитесь на главную
      </div>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          height: 38, padding: '0 18px', borderRadius: 8,
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          color: 'var(--crm-text)', fontSize: 13, fontWeight: 500,
          textDecoration: 'none', transition: 'border-color 0.15s',
          marginTop: 4,
        }}
        className="crm-404-btn"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        На главную
      </Link>
      <style>{`.crm-404-btn:hover { border-color: var(--crm-blue) !important; color: var(--crm-blue) !important; }`}</style>
    </div>
  )
}
