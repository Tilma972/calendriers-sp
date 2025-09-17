// supabase/functions/track-email-open/index.ts - Tracking ouverture emails
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  }

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer le numéro de reçu depuis l'URL
    const url = new URL(req.url)
    const receiptNumber = url.searchParams.get('receipt')
    const userAgent = req.headers.get('user-agent') || ''
    const referer = req.headers.get('referer') || ''
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('cf-connecting-ip') || 
                    'unknown'

    console.log('📧 Tracking ouverture email:', {
      receiptNumber,
      userAgent: userAgent.substring(0, 100), // Limiter la taille
      referer,
      clientIP
    })

    if (!receiptNumber) {
      console.warn('⚠️ Pas de numéro de reçu fourni')
      // Retourner pixel transparent même en cas d'erreur
      return new Response(
        // Pixel transparent 1x1
        new Uint8Array([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
          0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21,
          0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
          0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
          0x01, 0x00, 0x3B
        ]),
        { headers: corsHeaders }
      )
    }

    // Chercher le log email correspondant
    const { data: logs, error: selectError } = await supabase
      .from('email_logs')
      .select('id, status')
      .eq('receipt_number', receiptNumber)
      .in('status', ['sent', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (selectError) {
      console.error('Erreur récupération log:', selectError)
    } else if (logs && logs.length > 0) {
      const emailLog = logs[0]
      
      // Mettre à jour seulement si pas déjà ouvert
      if (emailLog.status !== 'opened') {
        const { error: updateError } = await supabase
          .from('email_logs')
          .update({
            status: 'opened',
            opened_at: new Date().toISOString(),
            user_agent: userAgent.substring(0, 500) // Limiter la taille
          })
          .eq('id', emailLog.id)

        if (updateError) {
          console.error('Erreur mise à jour log:', updateError)
        } else {
          console.log('✅ Ouverture email trackée:', receiptNumber)
        }
      } else {
        console.log('📧 Email déjà marqué comme ouvert:', receiptNumber)
      }
    } else {
      console.warn('⚠️ Aucun log trouvé pour le reçu:', receiptNumber)
    }

    // Toujours retourner un pixel transparent 1x1 (GIF)
    return new Response(
      new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21,
        0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3B
      ]),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Content-Length': '43'
        } 
      }
    )

  } catch (error: unknown) {
    console.error('❌ Erreur tracking:', error)
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Tracking error message:', message)

    // Retourner pixel transparent même en cas d'erreur
    return new Response(
      new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21,
        0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3B
      ]),
      { headers: corsHeaders }
    )
  }
})