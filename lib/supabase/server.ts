import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain
        ? {
            cookieOptions: {
              domain,
              path: '/',
              sameSite: 'lax',
              secure: true,
              maxAge: 60 * 60 * 24 * 7,
            },
          }
        : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Called from Server Component — safe to ignore,
            // middleware handles session refresh
          }
        },
      },
    }
  )
}
