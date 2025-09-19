import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Refresh session and mirror cookies into the response if needed
  const response = await updateSession(request);

  // 2) Create a temporary server client to read the current user (no cookie adapter needed)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() { return null },
        set() {},
        remove() {},
      }
    }
  );

  const { data: { user } = { user: null } } = await supabase.auth.getUser();

  // If user not authenticated and trying to access protected route, redirect to /auth
  if (!user && !pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // On exclut les fichiers statiques, les images, etc.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};