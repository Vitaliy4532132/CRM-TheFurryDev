import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TheFurryDev CRM',
  description: 'CRM панель для Minecraft-студии TheFurryDev',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
