import { useState, useEffect } from 'react'

export function usePrivacyMode() {
  const [isPrivate, setIsPrivate] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('crm_privacy_mode') === 'true'
  })

  const toggle = () => {
    setIsPrivate(prev => {
      const next = !prev
      localStorage.setItem('crm_privacy_mode', String(next))
      return next
    })
  }

  useEffect(() => {
    if (isPrivate) {
      document.documentElement.setAttribute('data-privacy', 'true')
    } else {
      document.documentElement.removeAttribute('data-privacy')
    }
  }, [isPrivate])

  return { isPrivate, toggle }
}
