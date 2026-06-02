'use client'

interface Props {
  children: React.ReactNode
  className?: string
}

export function SensitiveValue({ children, className }: Props) {
  return (
    <span className={`crm-sensitive${className ? ' ' + className : ''}`}>
      {children}
    </span>
  )
}
