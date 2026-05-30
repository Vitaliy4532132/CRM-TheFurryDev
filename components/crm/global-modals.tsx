'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { CreateOrderModal } from '@/components/crm/modals/create-order-modal'
import { getClients, getServices } from '@/lib/crm/api'
import type { CRMClient, CRMService } from '@/types/crm'

function GlobalModalsInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const [clients,  setClients]  = useState<CRMClient[]>([])
  const [services, setServices] = useState<CRMService[]>([])

  const isOpen = searchParams.get('modal') === 'create-order'

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return
    Promise.all([getClients(), getServices()])
      .then(([c, s]) => { setClients(c); setServices(s) })
      .catch(console.error)
  }, [isOpen])

  const closeModal = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('modal')
    const search = params.toString()
    router.replace(pathname + (search ? `?${search}` : ''))
  }, [pathname, router, searchParams])

  const handleSuccess = useCallback(() => {
    closeModal()
    router.refresh()
  }, [closeModal, router])

  const refreshClients = useCallback(async () => {
    const c = await getClients()
    setClients(c)
  }, [])

  return (
    <CreateOrderModal
      open={isOpen}
      onClose={closeModal}
      onSuccess={handleSuccess}
      clients={clients}
      services={services}
      onClientCreated={refreshClients}
    />
  )
}

export function GlobalModals() {
  return (
    <Suspense fallback={null}>
      <GlobalModalsInner />
    </Suspense>
  )
}
