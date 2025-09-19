import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create a mutable response so we can mirror any cookie changes
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value ?? null
        },
        set(name: string, value: string, options: CookieOptions) {
          // Mirror cookie writes onto the response so the browser receives them
          response.cookies.set({ name, value, ...options } as any)
          // Recreate response to ensure headers are up to date (safe no-op if not needed)
          response = NextResponse.next({ request: { headers: request.headers } })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options } as any)
          response = NextResponse.next({ request: { headers: request.headers } })
        },
      },
    }
  )

  // Refresh the session / user. This triggers Supabase internals to set cookies when needed.
  // Use getSession() which will refresh tokens when possible.
  await supabase.auth.getSession()

  return response
}
