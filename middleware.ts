import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Crée une réponse qui pourra être modifiée (pour les cookies)
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Utilisation du client Supabase standard pour le SSR (Server-Side Rendering)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { 'Content-Type': 'application/json' } },
      // We implement a simple cookie adapter so the server-side client can read/set cookies
      // while running inside Next.js middleware.
      // Supabase JS doesn't currently accept a typed cookie adapter here, but we only
      // need get/set/remove that interact with Next's Request/Response cookies.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: Record<string, unknown>) {
          // NextResponse.cookies.set expects an object. We cast options to any to avoid strict typing issues here.
          response.cookies.set({ name, value, ...(options as any) });
        },
        remove(name: string, options?: Record<string, unknown>) {
          response.cookies.set({ name, value: '', ...(options as any) });
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