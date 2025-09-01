// src/app/api/donations/send-receipt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabase';
import { ReceiptService } from '@/shared/lib/receipt-service';
import { ReceiptStorageService } from '@/shared/services/receiptStorageService';
import type { ReceiptData } from '@/shared/lib/receipt-service';

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
    console.log('📧 Nouvelle requête send-receipt...');
    
    const body: SendReceiptRequest = await request.json();
    const { transactionId, resend = false, donatorInfo, sapeurInfo, options = {} } = body;
    
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
    
    // 1. Récupérer la transaction avec jointure profil sapeur
    console.log(`🔍 Recherche transaction: ${transactionId}`);
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id, amount, calendars_given, payment_method, donator_name, donator_email,
        created_at, receipt_number, receipt_status, receipt_generated_at, receipt_pdf_url,
        profiles!inner(full_name, email)
      `)
      .eq('id', transactionId)
      .single();
    
    if (fetchError || !transaction) {
      console.error('❌ Transaction non trouvée:', fetchError);
      return NextResponse.json({ 
        error: 'Transaction non trouvée',
        transactionId 
      }, { status: 404 });
    }
    
    // Utiliser les infos fournies ou celles de la DB
    const finalDonatorEmail = donatorInfo?.email || transaction.donator_email;
    const finalDonatorName = donatorInfo?.name || transaction.donator_name || 'Donateur anonyme';
    
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
    let receiptNumber = transaction.receipt_number;
    if (!receiptNumber) {
      const date = new Date(transaction.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      receiptNumber = `RECU-${year}-${month}-${day}-${transaction.id.slice(-6).toUpperCase()}`;
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
      .single();
    
    // 6. Préparer les données du reçu
    const receiptData: ReceiptData = {
      receiptNumber,
      donationDate: new Date(transaction.created_at).toISOString(),
      donatorName: finalDonatorName,
      donatorEmail: finalDonatorEmail,
      amount: transaction.amount,
      calendarsGiven: transaction.calendars_given,
      paymentMethod: transaction.payment_method,
      sapeurName: sapeurInfo?.name || transaction.profiles?.full_name || 'Équipe des Sapeurs-Pompiers',
      associationName: settings?.association_name || 'Amicale des Sapeurs-Pompiers de Clermont-l\'Hérault',
      associationAddress: settings?.association_address || '34800 Clermont-l\'Hérault, France',
      associationSiren: settings?.association_siren || 'À compléter',
      associationRNA: settings?.association_rna || 'À compléter',
      legalText: settings?.legal_text || 'Ce reçu vous est délivré à des fins comptables et justificatives.',
      transactionId,
      templateVersion: settings?.template_version || 'v1',
      quality: options.quality || 'standard'
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
    
    // 8. Envoyer la demande à n8n (asynchrone)
    console.log('🚀 Envoi vers n8n workflow...');
    const receiptResult = await ReceiptService.sendReceiptRequest(receiptData, {
      send_email: options.sendEmail !== false,
      generate_pdf: true,
      store_in_supabase: true,
      quality: options.quality || 'standard'
    });
    
    if (!receiptResult.success) {
      console.error('❌ Erreur n8n workflow:', receiptResult.error);
      
      // Mettre à jour les logs avec l'erreur
      await ReceiptStorageService.updateEmailLog(transactionId, {
        status: 'failed',
        errorMessage: receiptResult.error || 'Erreur envoi vers n8n workflow'
      });
      
      await supabase
        .from('transactions')
        .update({
          receipt_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);
      
      return NextResponse.json({ 
        error: 'Erreur envoi vers n8n',
        details: receiptResult.error,
        receiptNumber,
        transactionId
      }, { status: 500 });
    }
    
    // 9. Réponse de succès
    const result = {
      success: true,
      receiptNumber,
      emailTo: finalDonatorEmail,
      workflowId: receiptResult.workflowId,
      executionId: receiptResult.workflowId, // n8n peut fournir les deux
      message: resend ? 'Reçu renvoyé avec succès' : 'Reçu envoyé avec succès',
      estimatedProcessingTime: receiptResult.estimatedProcessingTime,
      quality: options.quality || 'standard',
      sendEmail: options.sendEmail !== false,
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
    } catch {}
    
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
    
    // 1. Test connexion n8n
    const n8nTest = await ReceiptService.testN8nConnection();
    
    // 2. Test système de stockage
    const storageHealth = await ReceiptStorageService.healthCheck();
    
    // 3. Configuration n8n
    const n8nConfig = ReceiptService.getConfiguration();
    const n8nValidation = ReceiptService.validateEnvironment();
    
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
      n8nTest.success && 
      storageHealth.healthy && 
      dbHealthy && 
      n8nValidation.valid;
    
    const response = {
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      
      checks: {
        n8nConnection: n8nTest,
        storage: storageHealth,
        database: dbHealthy,
        configuration: n8nValidation
      },
      
      stats: {
        cache: cacheStats,
        email24h: emailStatsResult.success ? emailStatsResult.stats : {},
        recentTransactions: recentTransactions?.length || 0
      },
      
      configuration: {
        n8n: {
          hasUrl: !!n8nConfig.n8nUrl,
          hasApiKey: n8nConfig.hasApiKey,
          url: n8nConfig.n8nUrl // Partiellement masqué
        },
        app: {
          url: n8nConfig.appUrl
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