// src/app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Créer un client Supabase côté serveur avec les cookies de la requête
    const cookieStore = request.headers.get('Cookie');
    
    if (!cookieStore) {
      return NextResponse.json({ error: 'No auth cookies' }, { status: 401 });
    }

    // Parser les cookies pour récupérer le token
    const cookies = Object.fromEntries(
      cookieStore.split('; ').map(cookie => cookie.split('='))
    );

    // Chercher le token d'accès dans les cookies Supabase
    const accessToken = Object.keys(cookies).find(key => 
      key.includes('supabase') && key.includes('access')
    );

    if (!accessToken || !cookies[accessToken]) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    // Vérifier le token avec Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(cookies[accessToken]);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      role: profile.role,
      userId: user.id 
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}