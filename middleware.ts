// middleware.ts - Version simplifiée sans auth-helpers-nextjs
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  console.log('🔍 Middleware executing for:', pathname);

  // Récupérer les cookies d'auth Supabase
  const authCookies = request.cookies.getAll().filter(cookie => 
    cookie.name.includes('supabase') || 
    cookie.name.includes('sb-')
  );

  console.log('🍪 Auth cookies found:', authCookies.length);

  // Si pas de cookies d'auth et route admin -> redirection
  if (authCookies.length === 0 && pathname.startsWith('/admin')) {
    console.log('❌ No auth, redirecting admin to home');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si on a des cookies d'auth, faire un appel à l'API pour vérifier le rôle
  if (authCookies.length > 0) {
    try {
      // Appel à notre API route pour vérifier le profil
      const profileUrl = new URL('/api/auth/profile', request.url);
      const profileResponse = await fetch(profileUrl.toString(), {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        },
      });

      if (profileResponse.ok) {
        const { role } = await profileResponse.json();
        
        console.log('👤 User role:', role);

        // LOGIQUE DE ROUTAGE
        if (role === 'tresorier' && pathname === '/') {
          console.log('🏛️ Redirecting treasurer to admin');
          return NextResponse.redirect(new URL('/admin', request.url));
        }

        if (role !== 'tresorier' && pathname.startsWith('/admin')) {
          console.log('🚫 Non-treasurer blocked from admin');
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    } catch (error) {
      console.error('❌ Middleware auth check failed:', error);
    }
  }

  console.log('✅ Middleware allowing request');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};