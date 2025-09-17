// src/app/api/qr/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, userAgent } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Récupérer l'adresse IP du client
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = forwardedFor?.split(',')[0] || realIP || '127.0.0.1';

    console.log('🔄 Initiating QR interaction for team:', teamId);

    // Appeler la fonction Supabase pour initier l'interaction
    const { data, error } = await supabase.rpc('initiate_qr_interaction', {
      team_uuid: teamId,
      user_agent_param: userAgent || null,
      ip_address_param: clientIP
    });

    if (error) {
      console.error('❌ Error initiating QR interaction:', error);
      return NextResponse.json(
        { error: 'Failed to initiate QR interaction: ' + error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data returned from QR interaction initiation' },
        { status: 500 }
      );
    }

    const result = data[0];
    
    console.log('✅ QR interaction initiated:', {
      interaction_id: result.interaction_id,
      expires_at: result.expires_at
    });

    return NextResponse.json({
      interaction_id: result.interaction_id,
      stripe_payment_link_url: result.stripe_payment_link_url,
      expires_at: result.expires_at,
      status: 'pending'
    });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Error in QR initiate API:', error);
      return NextResponse.json(
        { error: 'Internal server error: ' + error.message },
        { status: 500 }
      );
    }
    console.error('❌ Error in QR initiate API:', String(error));
    return NextResponse.json(
      { error: 'Internal server error: ' + String(error) },
      { status: 500 }
    );
  }
}