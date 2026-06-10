import { useState, useCallback } from 'react'

export function useUnsavedChanges() {
  const [showConfirm, setShowConfirm] = useState(false)

  // Без initial (create-модалки): «есть изменения» = любое непустое поле.
  // С initial (edit-модалки): «есть изменения» = поле отличается от исходного.
  const hasChanges = useCallback(
    (fields: Record<string, unknown>, initial?: Record<string, unknown>) => {
      if (initial) {
        return Object.keys(fields).some(k => fields[k] !== initial[k])
      }
      return Object.values(fields).some(v =>
        v !== '' && v !== null && v !== undefined && v !== 0 && v !== '0'
      )
    },
    []
  )

  const handleClose = useCallback(
    (
      fields: Record<string, unknown>,
      onClose: () => void,
      initial?: Record<string, unknown>,
    ) => {
      if (hasChanges(fields, initial)) {
        setShowConfirm(true)
      } else {
        onClose()
      }
    },
    [hasChanges]
  )

  const confirmClose = useCallback((onClose: () => void) => {
    setShowConfirm(false)
    onClose()
  }, [])

  const cancelClose = useCallback(() => {
    setShowConfirm(false)
  }, [])

  return { showConfirm, handleClose, confirmClose, cancelClose }
}
