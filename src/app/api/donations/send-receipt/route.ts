// src/app/api/donations/send-receipt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabase';
import { ReceiptStorageService } from '@/shared/services/receiptStorageService';
import { ReceiptTemplateService, type ReceiptData } from '@/shared/templates/receipt-template';
import * as nodemailer from 'nodemailer';

// Interfaces pour résoudre les erreurs TypeScript
interface TransactionForReceipt {
  id: string;
  user_id: string;
  team_id: string;
  amount: number;
  calendars_given: number;
  payment_method: string;
  donator_name: string | null;
  donator_email: string | null;
  notes: string | null;
  created_at: string;
  sapeur_name: string | null;
  team_name: string | null;
  receipt_number?: string | null;
}

interface EmailSettings {
  association_name: string | null;
  association_address: string | null;
  association_siren: string | null;
  association_rna: string | null;
  legal_text: string | null;
  template_version: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
}

// Cache pour idempotence (en production, utiliser Redis ou DB)
const processedRequests = new Map<string, { timestamp: number; result: any }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface SendReceiptRequest {
  transactionId: string;
  resend?: boolean;
  donatorInfo?: {
    name?: string;
    email?: string;
  };
  sapeurInfo?: {
    name?: string;
  };
  options?: {
    quality?: 'draft' | 'standard' | 'high';
    sendEmail?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔥🔥🔥 API APPELÉE - DÉBUT 🔥🔥🔥');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));

    const body: SendReceiptRequest = await request.json();
    console.log('🔥 Body reçu:', JSON.stringify(body, null, 2));

    const { transactionId, resend = false, donatorInfo, sapeurInfo, options = {} } = body;

    console.log('🔥 Transaction ID:', transactionId);
    console.log('🔥 Donator Info:', donatorInfo);

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID requis' }, { status: 400 });
    }

    // 🔒 Idempotence : vérifier si déjà traité récemment
    const cacheKey = `${transactionId}-${resend ? 'resend' : 'initial'}-${options.quality || 'standard'}`;
    const cached = processedRequests.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`⚡ Requête idempotente détectée pour ${transactionId}`);
      return NextResponse.json({
        ...cached.result,
        fromCache: true,
        cachedAt: new Date(cached.timestamp).toISOString()
      });
    }

    // 1. Récupérer la transaction 
    const { data: transactions, error: fetchError } = await supabase
      .rpc('get_transaction_for_receipt' as any, {
        transaction_id: transactionId
      }) as { data: TransactionForReceipt[] | null, error: any };

    if (fetchError || !transactions || transactions.length === 0) {
      console.error('❌ Transaction non trouvée:', fetchError);
      return NextResponse.json({
        error: 'Transaction non trouvée',
        transactionId
      }, { status: 404 });
    }

    // Utiliser les infos fournies ou celles de la DB
    const finalDonatorEmail = donatorInfo?.email || transactions[0].donator_email;
    const finalDonatorName = donatorInfo?.name || transactions[0].donator_name || 'Donateur anonyme';

    if (!finalDonatorEmail) {
      console.warn(`⚠️ Aucun email donateur pour ${transactionId}`);
      return NextResponse.json({
        error: 'Aucun email donateur disponible',
        transactionId,
        suggestion: 'Ajoutez donatorInfo.email à votre requête'
      }, { status: 400 });
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalDonatorEmail)) {
      return NextResponse.json({
        error: 'Format email invalide',
        email: finalDonatorEmail
      }, { status: 400 });
    }

    // 2. Vérifier si un reçu existe déjà (sauf si resend)
    if (!resend) {
      const existingReceipt = await ReceiptStorageService.checkReceiptExists(transactionId);
      if (existingReceipt.exists && !existingReceipt.error) {
        console.log(`ℹ️ Reçu déjà existant: ${existingReceipt.receiptNumber}`);
        return NextResponse.json({
          success: true,
          receiptNumber: existingReceipt.receiptNumber,
          emailTo: finalDonatorEmail,
          message: 'Reçu déjà envoyé précédemment',
          lastSent: existingReceipt.lastSent,
          status: existingReceipt.status,
          isExisting: true
        });
      }
    }

    // 3. Générer le numéro de reçu si absent
    let receiptNumber = transactions[0]?.receipt_number;
    if (!receiptNumber) {
      const date = new Date(transactions[0]?.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      receiptNumber = `RECU-${year}-${month}-${day}-${transactions[0]?.id.slice(-6).toUpperCase()}`;
    }

    console.log(`📝 Reçu à traiter: ${receiptNumber} → ${finalDonatorEmail}`);

    // 4. Créer le log email (statut pending)
    const subject = `🙏 Merci ${finalDonatorName} ! Votre don fait la différence`;
    await ReceiptStorageService.createEmailLog({
      transactionId,
      emailTo: finalDonatorEmail,
      subject,
      status: 'pending',
      receiptNumber,
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // 5. Récupérer les paramètres de l'association
    const { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single() as { data: EmailSettings | null };

    // 6. Préparer les données du reçu
    const receiptData: ReceiptData = {
      receiptNumber,
      donationDate: new Date(transactions[0].created_at).toISOString(),
      donatorName: finalDonatorName,
      donatorEmail: finalDonatorEmail,
      amount: transactions[0].amount,
      calendarsGiven: transactions[0].calendars_given,
      paymentMethod: transactions[0].payment_method,
      sapeurName: sapeurInfo?.name || 'Équipe des Sapeurs-Pompiers',
      associationName: settings?.association_name || 'Amicale des Sapeurs-Pompiers de Clermont-l\'Hérault',
      associationAddress: settings?.association_address || '34800 Clermont-l\'Hérault, France',
      associationSiren: settings?.association_siren || 'À compléter',
      associationRNA: settings?.association_rna || 'À compléter',
      legalText: settings?.legal_text || 'Ce reçu vous est délivré à des fins comptables et justificatives.'
    };

    // 7. Mettre à jour le statut de la transaction (en cours)
    await supabase
      .from('transactions')
      .update({
        receipt_status: 'pending',
        receipt_number: receiptNumber,
        receipt_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    // 8. Générer HTML du reçu
    console.log('📝 Génération HTML du reçu...');
    const htmlContent = ReceiptTemplateService.generateReceiptHTML(receiptData);

    // 9. Convertir HTML en PDF via Gotenberg
    console.log('🔄 Conversion PDF via Gotenberg...');
    const pdfResult = await convertHtmlToPdf(htmlContent, receiptNumber);

    if (!pdfResult.success) {
      console.error('❌ Erreur conversion PDF:', pdfResult.error);

      // Mettre à jour les logs avec l'erreur
      await ReceiptStorageService.updateEmailLog(transactionId, {
        status: 'failed',
        errorMessage: pdfResult.error || 'Erreur conversion PDF'
      });

      await supabase
        .from('transactions')
        .update({
          receipt_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      return NextResponse.json({
        error: 'Erreur conversion PDF',
        details: pdfResult.error,
        receiptNumber,
        transactionId
      }, { status: 500 });
    }

    /// 10. Stocker le PDF dans Supabase Storage
    console.log('💾 Stockage PDF dans Supabase...');
    const storageResult = await ReceiptStorageService.uploadReceiptPDF(
      pdfResult.pdfBuffer!,
      receiptNumber
    );

    if (!storageResult.success) {
      console.error('❌ ERREUR CRITIQUE STOCKAGE PDF:', storageResult.error);

      await ReceiptStorageService.updateEmailLog(transactionId, {
        status: 'failed',
        errorMessage: `Erreur stockage PDF: ${storageResult.error}`
      });

      return NextResponse.json({
        error: 'Erreur stockage PDF',
        details: storageResult.error,
        receiptNumber,
        transactionId,
        pdfGenerated: true
      }, { status: 500 });
    }

    console.log('✅ PDF stocké avec succès:', storageResult.publicUrl);

    // 11. Envoyer l'email avec PDF en pièce jointe
    if (options.sendEmail !== false) {
      console.log('📧 Envoi email avec PDF...');
      const emailResult = await sendEmailWithPdf({
        to: finalDonatorEmail,
        subject: `🙏 Merci ${finalDonatorName} ! Votre don fait la différence`,
        receiptData,
        pdfBuffer: pdfResult.pdfBuffer!,
        receiptNumber
      });

      if (!emailResult.success) {
        console.error('❌ Erreur envoi email:', emailResult.error);

        await ReceiptStorageService.updateEmailLog(transactionId, {
          status: 'failed',
          errorMessage: emailResult.error || 'Erreur envoi email'
        });

        return NextResponse.json({
          error: 'Erreur envoi email',
          details: emailResult.error,
          receiptNumber,
          transactionId,
          pdfGenerated: true,
          pdfUrl: storageResult.publicUrl
        }, { status: 500 });
      }

      // Mettre à jour les logs avec le succès
      await ReceiptStorageService.updateEmailLog(transactionId, {
        status: 'sent',
        sentAt: new Date().toISOString()
      });
    }

    // 12. Mettre à jour la transaction avec succès
    await supabase
      .rpc('update_receipt_number' as any, {
        transaction_id: transactionId,
        receipt_num: receiptNumber
      });

    await supabase
      .from('transactions')
      .update({
        receipt_status: 'generated',
        receipt_generated_at: new Date().toISOString(),
        receipt_pdf_url: storageResult.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    // 13. Réponse de succès
    const result = {
      success: true,
      receiptNumber,
      emailTo: finalDonatorEmail,
      message: resend ? 'Reçu renvoyé avec succès' : 'Reçu envoyé avec succès',
      quality: options.quality || 'standard',
      sendEmail: options.sendEmail !== false,
      pdfGenerated: true,
      pdfUrl: storageResult.publicUrl,
      transactionId,
      timestamp: new Date().toISOString()
    };

    // Cache la réponse pour idempotence
    processedRequests.set(cacheKey, {
      timestamp: Date.now(),
      result: { ...result, fromCache: false }
    });

    // Nettoyer le cache périodiquement
    if (processedRequests.size > 1000) {
      console.log('🧹 Nettoyage cache idempotence...');
      const now = Date.now();
      let cleaned = 0;
      for (const [key, value] of processedRequests.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          processedRequests.delete(key);
          cleaned++;
        }
      }
      console.log(`🧹 Cache nettoyé: ${cleaned} entrées supprimées`);
    }

    console.log(`✅ Reçu traité avec succès: ${receiptNumber} → ${finalDonatorEmail} (${resend ? 'Renvoi' : 'Initial'})`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erreur API send-receipt:', error);

    // Log de l'erreur si on a le transactionId
    let transactionId = '';
    try {
      const body = await request.json();
      transactionId = body.transactionId;
    } catch { }

    if (transactionId) {
      await ReceiptStorageService.createEmailLog({
        transactionId,
        emailTo: 'unknown',
        subject: 'Erreur traitement reçu',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }

    return NextResponse.json(
      {
        error: 'Erreur interne serveur',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Route de test et monitoring
export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Health check API send-receipt...');

    // 1. Test connexion Gotenberg
    const gotenbergTest = await testGotenbergConnection();

    // 2. Test système de stockage
    const storageHealth = await ReceiptStorageService.healthCheck();

    // 3. Test SMTP
    const smtpTest = await testSmtpConnection();

    // 4. Statistiques des emails dernières 24h
    const emailStatsResult = await ReceiptStorageService.getEmailStats24h();

    // 5. État du cache d'idempotence
    const cacheStats = {
      size: processedRequests.size,
      maxSize: 1000,
      utilizationPercent: Math.round((processedRequests.size / 1000) * 100)
    };

    // 6. Test base de données récent
    const { data: recentTransactions, error: dbError } = await supabase
      .from('transactions')
      .select('id, created_at')
      .not('donator_email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const dbHealthy = !dbError && recentTransactions !== null;

    // 7. Santé globale
    const overallHealthy =
      gotenbergTest.success &&
      storageHealth.healthy &&
      dbHealthy &&
      smtpTest.success;

    const response = {
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'unknown',

      checks: {
        gotenbergConnection: gotenbergTest,
        storage: storageHealth,
        database: dbHealthy,
        smtpConnection: smtpTest
      },

      stats: {
        cache: cacheStats,
        email24h: emailStatsResult.success ? emailStatsResult.stats : {},
        recentTransactions: recentTransactions?.length || 0
      },

      configuration: {
        gotenberg: {
          hasUrl: !!process.env.GOTENBERG_URL,
          hasAuth: !!(process.env.GOTENBERG_USERNAME && process.env.GOTENBERG_PASSWORD),
          url: process.env.GOTENBERG_URL?.replace(/\/[^/]*$/, '/***')
        },
        smtp: {
          configured: checkSmtpConfig()
        }
      },

      endpoints: {
        post: '/api/donations/send-receipt - Envoyer un reçu',
        get: '/api/donations/send-receipt - Health check',
        delete: '/api/donations/send-receipt - Vider le cache'
      }
    };

    const httpStatus = overallHealthy ? 200 : 503;
    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    console.error('❌ Erreur health check:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Nettoyage du cache (appelé par un cron ou webhook)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    let cleaned = 0;

    if (force) {
      // Vider complètement le cache
      cleaned = processedRequests.size;
      processedRequests.clear();
      console.log(`🧹 Cache forcé vidé: ${cleaned} entrées supprimées`);
    } else {
      // Nettoyer seulement les entrées expirées
      const now = Date.now();
      for (const [key, value] of processedRequests.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          processedRequests.delete(key);
          cleaned++;
        }
      }
      console.log(`🧹 Cache nettoyé: ${cleaned} entrées expirées supprimées`);
    }

    return NextResponse.json({
      success: true,
      message: force ? 'Cache complètement vidé' : 'Entrées expirées supprimées',
      itemsCleared: cleaned,
      remainingItems: processedRequests.size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur nettoyage cache',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions
async function convertHtmlToPdf(htmlContent: string, receiptNumber: string): Promise<{
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
}> {
  try {
    if (!process.env.GOTENBERG_URL || !process.env.GOTENBERG_USERNAME || !process.env.GOTENBERG_PASSWORD) {
      throw new Error('Configuration Gotenberg manquante');
    }

    const credentials = `${process.env.GOTENBERG_USERNAME}:${process.env.GOTENBERG_PASSWORD}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    const endpoint = `${process.env.GOTENBERG_URL}/forms/chromium/convert/html`;

    // Créer FormData
    const formData = new FormData();

    // Fichier HTML
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    formData.append('files', htmlBlob, 'index.html');

    // Options PDF
    formData.append('paperWidth', '8.27'); // A4 width
    formData.append('paperHeight', '11.7'); // A4 height
    formData.append('marginTop', '0.79'); // 20mm
    formData.append('marginBottom', '0.79'); // 20mm
    formData.append('marginLeft', '0.79'); // 20mm
    formData.append('marginRight', '0.79'); // 20mm
    formData.append('printBackground', 'true');
    formData.append('scale', '1.0');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gotenberg error: ${response.status} - ${errorText}`);
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`);

    return { success: true, pdfBuffer };

  } catch (error: any) {
    console.error('❌ Erreur conversion PDF:', error);
    return { success: false, error: error.message };
  }
}


async function sendEmailWithPdf({
  to, subject, receiptData, pdfBuffer, receiptNumber
}: {
  to: string; subject: string; receiptData: ReceiptData;
  pdfBuffer: Buffer; receiptNumber: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧🔥 DÉBUT ENVOI EMAIL 🔥📧');
    console.log('📧 To:', to);
    console.log('📧 Subject:', subject);

    // Configuration SMTP
    const { data: smtpConfig, error: configError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single();

    console.log('📧 SMTP Config loaded:', !!smtpConfig);
    console.log('📧 SMTP Host:', smtpConfig?.smtp_host);
    console.log('📧 SMTP Port:', smtpConfig?.smtp_port);
    console.log('📧 SMTP User:', smtpConfig?.smtp_user);

    if (configError || !smtpConfig) {
      console.log('❌ ERREUR CONFIG SMTP:', configError);
      throw new Error('Configuration SMTP non trouvée');
    }

    // Créer le transporteur
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_port === 465,
      auth: {
        user: smtpConfig.smtp_user,
        pass: smtpConfig.smtp_password
      }
    } as any);

    console.log('📧 Transporteur créé, test de connection...');

    // AJOUT IMPORTANT : Tester la connexion
    try {
      await transporter.verify();
      console.log('✅ Connexion SMTP vérifiée avec succès');
    } catch (verifyError) {
      console.log('❌ ERREUR VÉRIFICATION SMTP:', verifyError);
      throw new Error(`Erreur connexion SMTP: ${verifyError}`);
    }

    // Générer contenu
    const htmlContent = ReceiptTemplateService.generateReceiptHTML(receiptData);
    const textContent = ReceiptTemplateService.generateReceiptText(receiptData);

    console.log('📧 Contenu généré, envoi en cours...');
    console.log('📧 PDF Buffer size:', pdfBuffer.length);

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: `${smtpConfig.smtp_from_name} <${smtpConfig.smtp_from_email}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
      attachments: [{
        filename: `${receiptNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    console.log('✅✅✅ EMAIL ENVOYÉ AVEC SUCCÈS ✅✅✅');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 Envelope:', info.envelope);

    return { success: true };

  } catch (error: any) {
    console.error('❌❌❌ ERREUR ENVOI EMAIL ❌❌❌');
    console.error('📧 Error message:', error.message);
    console.error('📧 Error stack:', error.stack);
    console.error('📧 Full error:', error);
    return { success: false, error: error.message };
  }
}

async function testGotenbergConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.GOTENBERG_URL || !process.env.GOTENBERG_USERNAME || !process.env.GOTENBERG_PASSWORD) {
      return { success: false, error: 'Configuration Gotenberg manquante' };
    }

    const credentials = `${process.env.GOTENBERG_USERNAME}:${process.env.GOTENBERG_PASSWORD}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    const response = await fetch(`${process.env.GOTENBERG_URL}/health`, {
      headers: {
        'Authorization': `Basic ${encodedCredentials}`
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: smtpConfig, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !smtpConfig) {
      return { success: false, error: 'Configuration SMTP non trouvée' };
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_port === 465,
      auth: {
        user: smtpConfig.smtp_user,
        pass: smtpConfig.smtp_password
      }
    });

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function checkSmtpConfig(): boolean {
  // Cette fonction vérifiera si les variables SMTP sont configurées
  return true; // À implémenter selon vos besoins
}
