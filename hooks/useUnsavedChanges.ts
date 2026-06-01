import { useState, useCallback } from 'react'

export function useUnsavedChanges() {
  const [showConfirm, setShowConfirm] = useState(false)

  const hasChanges = useCallback((fields: Record<string, unknown>) => {
    return Object.values(fields).some(v =>
      v !== '' && v !== null && v !== undefined && v !== 0 && v !== '0'
    )
  }, [])

  const handleClose = useCallback(
    (fields: Record<string, unknown>, onClose: () => void) => {
      if (hasChanges(fields)) {
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
