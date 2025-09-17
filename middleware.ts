import { NextRequest, NextResponse } from 'next/server';

const rateLimit = new Map();

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/qr/initiate')) {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 5; // Max 5 QR par minute par IP

    const requests = rateLimit.get(ip) || [];
    const validRequests = requests.filter((time: number) => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 });
    }
    
    rateLimit.set(ip, [...validRequests, now]);
  }
}

export const config = {
  matcher: '/api/qr/initiate'
};