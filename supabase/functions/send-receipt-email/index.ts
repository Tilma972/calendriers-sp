// supabase/functions/send-receipt-email/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SMTP_CONFIG = {
  hostname: Deno.env.get('SMTP_HOST') || 'localhost',
  port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
  username: Deno.env.get('SMTP_USER') || 'no-reply@pompiers34800.com',
  password: Deno.env.get('SMTP_PASSWORD') || '',
}

interface EmailRequest {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  receiptData?: {
    receiptNumber: string;
    amount: number;
    donatorName?: string;
  };
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, from, subject, html, text, receiptData }: EmailRequest = await req.json()

    console.log('📧 Tentative envoi email:', { to, subject, receiptNumber: receiptData?.receiptNumber })

    // Validation des données requises
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants (to, subject, html/text)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Configuration SMTP pour envoi direct (fallback si pas de service externe)
    const emailPayload = {
      from: from || 'no-reply@pompiers34800.com',
      to: to,
      subject: subject,
      html: html,
      text: text,
      headers: {
        'X-Receipt-Number': receiptData?.receiptNumber || '',
        'X-Amount': receiptData?.amount?.toString() || '',
      }
    }

    // Tentative d'envoi via fetch vers le service SMTP configuré dans docker-compose
    try {
      // Simuler l'envoi réussi pour le développement
      // En production, cela devrait utiliser le vrai service SMTP
      console.log('✅ Email simulé envoyé:', emailPayload)
      
      // Log pour debug
      console.log('SMTP Config:', {
        host: SMTP_CONFIG.hostname,
        port: SMTP_CONFIG.port,
        user: SMTP_CONFIG.username,
        hasPassword: !!SMTP_CONFIG.password
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email envoyé avec succès',
          receiptNumber: receiptData?.receiptNumber,
          debug: {
            to: emailPayload.to,
            subject: emailPayload.subject,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (smtpError: unknown) {
      console.error('❌ Erreur SMTP:', smtpError)
      const message = smtpError instanceof Error ? smtpError.message : String(smtpError)

      return new Response(
        JSON.stringify({ 
          error: 'Erreur envoi SMTP', 
          details: message,
          config: {
            host: SMTP_CONFIG.hostname,
            port: SMTP_CONFIG.port,
            hasAuth: !!SMTP_CONFIG.username
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error: unknown) {
    console.error('❌ Erreur edge function:', error)
    const message = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne', 
        details: message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})