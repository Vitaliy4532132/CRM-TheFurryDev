'use client'

import { useEffect } from 'react'
import { usePrivacyMode } from '@/hooks/usePrivacyMode'

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const { isPrivate } = usePrivacyMode()

  useEffect(() => {
    if (isPrivate) {
      document.documentElement.setAttribute('data-privacy', 'true')
    } else {
      document.documentElement.removeAttribute('data-privacy')
    }
  }, [isPrivate])

  return <>{children}</>
}
