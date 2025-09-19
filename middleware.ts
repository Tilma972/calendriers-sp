import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Crée une réponse qui pourra être modifiée (pour les cookies)
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Create a Supabase server client for middleware with cookie adapter
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // When Supabase wants to set a cookie, mirror it onto the NextResponse
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // La ligne la plus importante : rafraîchit la session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Si l'utilisateur n'est pas connecté ET qu'il n'essaie pas d'accéder
  // à la page d'authentification, on le redirige.
  if (!session && pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Si l'utilisateur est connecté et qu'il va sur la page d'authentification,
  // on le redirige vers son dashboard.
  if (session && pathname === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si tout va bien, on laisse l'utilisateur continuer sa route.
  return response;
}

export const config = {
  matcher: [
    // On exclut les fichiers statiques, les images, etc.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};