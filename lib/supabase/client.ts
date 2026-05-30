import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Strip leading dot — RFC 6265 forbids it; modern cookie packages reject ".domain"
  const raw    = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  const domain = raw?.startsWith('.') ? raw.slice(1) : raw

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
