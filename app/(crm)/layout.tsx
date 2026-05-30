import { Sidebar } from '@/components/crm/sidebar'
import { Topbar } from '@/components/crm/topbar'
import { GlobalModals } from '@/components/crm/global-modals'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--crm-bg)',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar userEmail={user.email ?? null} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {children}
        </main>
      </div>

      {/* Global modals driven by ?modal= URL param */}
      <GlobalModals />
    </div>
  )
}
