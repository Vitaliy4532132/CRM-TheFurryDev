import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain
      ? {
          cookieOptions: {
            domain,
            path: '/',
            sameSite: 'lax',
            secure: true,
            maxAge: 60 * 60 * 24 * 7, // 7 дней
          },
        }
      : undefined
  )
}
