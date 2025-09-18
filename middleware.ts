import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/shared/lib/supabase';

// Définissez ici les rôles qui ont accès à la section admin
const ADMIN_ROLES = ['admin', 'tresorier'];

// Pages publiques qui ne nécessitent pas d'authentification
const PUBLIC_PATHS = ['/auth', '/login', '/pending'];

function isPublicPath(pathname: string) {
  if (!pathname) return false;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/favicon')) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function extractAccessToken(request: NextRequest): string | null {
  // Prefer cookie store API
  try {
    const candidates = ['sb-access-token', 'supabase-auth-token', 'sb:token', 'supabase-token'];
    for (const name of candidates) {
      const c = request.cookies.get(name);
      if (c?.value) return c.value;
    }
  } catch {
    // fallback to parsing header
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(cookieHeader.split('; ').map((c) => c.split('=')));
    const key = Object.keys(cookies).find((k) => k.toLowerCase().includes('supabase') && k.toLowerCase().includes('access'))
      || Object.keys(cookies).find((k) => k.toLowerCase().includes('sb-access-token'))
      || Object.keys(cookies).find((k) => k.toLowerCase().includes('supabase-auth-token'));
    return key ? cookies[key] : null;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths immediately
  if (isPublicPath(pathname)) return NextResponse.next();

  // We only need to protect /admin paths per requirement
  const isAdminPath = pathname.startsWith('/admin');
  if (!isAdminPath) return NextResponse.next();

  // Need a server-side Supabase client to perform secure checks
  if (!supabaseAdmin) {
    console.warn('Middleware: supabaseAdmin not available. Redirecting to /auth');
    const url = new URL('/auth', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  // Extract access token from cookies
  const accessToken = extractAccessToken(request);
  if (!accessToken) {
    const url = new URL('/auth', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken as string);
    if (userError || !user) {
      const url = new URL('/auth', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    // Fetch profile via admin client (bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Redirect to main page if no profile
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (!ADMIN_ROLES.includes(profile.role ?? '')) {
      // Not authorized
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Authorized
    return NextResponse.next();
  } catch (err) {
    console.error('Middleware auth error:', err);
    const url = new URL('/auth', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};