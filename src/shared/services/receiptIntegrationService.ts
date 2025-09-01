// src/shared/services/receiptIntegrationService.ts - Intégration ReceiptService avec transactions

import { ReceiptService, ReceiptData } from '@/shared/lib/receipt-service';
import { supabase } from '@/shared/lib/supabase';

/**
 * Interface pour une transaction complète avec données enrichies
 */
export interface TransactionWithReceipt {
  id: string;
  user_id: string;
  team_id: string | null;
  tournee_id: string | null;
  amount: number;
  calendars_given: number;
  payment_method: 'especes' | 'cheque' | 'carte' | 'virement';
  donator_name?: string | null;
  donator_email?: string | null;
  notes?: string | null;
  status: string;
  receipt_status?: 'pending' | 'generated' | 'failed' | 'sent' | null;
  receipt_generated_at?: string | null;
  receipt_pdf_url?: string | null;
  created_at: string;
  updated_at: string;
  
  // Données enrichies (via JOINs)
  user_full_name?: string;
  team_name?: string;
}

/**
 * Service d'intégration pour génération automatique de reçus
 */
export class ReceiptIntegrationService {
  
  /**
   * Génère et envoie automatiquement un reçu pour une transaction
   */
  static async processTransactionReceipt(
    transactionId: string,
    options: {
      autoSend?: boolean;
      quality?: 'draft' | 'standard' | 'high';
      skipEmailValidation?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string; workflowId?: string; pdfUrl?: string }> {
    try {
      console.log(`🧾 Génération reçu pour transaction ${transactionId}...`);

      // 1. Récupérer les données de la transaction avec enrichissement
      const transaction = await this.getEnrichedTransaction(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction non trouvée' };
      }

      // 2. Valider que la transaction est éligible pour un reçu
      const validation = this.validateTransactionForReceipt(transaction);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 3. Préparer les données du reçu
      const receiptData = await this.buildReceiptData(transaction);

      // 4. Créer un log email en attente
      if (options.autoSend !== false && receiptData.donatorEmail) {
        await this.createEmailLog(transaction, receiptData.donatorEmail);
      }

      // 5. Marquer la transaction comme "reçu en cours"
      await this.updateTransactionReceiptStatus(transactionId, 'pending');

      // 6. Envoyer vers n8n
      const result = options.autoSend === false
        ? await ReceiptService.generatePdfOnly(receiptData, options.quality)
        : await ReceiptService.sendReceiptRequest(receiptData, {
            quality: options.quality,
            send_email: !!receiptData.donatorEmail
          });

      console.log(`${result.success ? '✅' : '❌'} Résultat génération reçu:`, result);

      return result;

    } catch (error: any) {
      console.error('❌ Erreur processTransactionReceipt:', error);
      
      // Marquer comme échec
      await this.updateTransactionReceiptStatus(transactionId, 'failed');
      
      return { 
        success: false, 
        error: error.message || 'Erreur inconnue' 
      };
    }
  }

  /**
   * Traite automatiquement les reçus pour toutes les transactions éligibles
   */
  static async processPendingReceipts(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    details: Array<{ transactionId: string; success: boolean; error?: string }>;
  }> {
    console.log('🔄 Traitement des reçus en attente...');

    // Récupérer les transactions éligibles
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id, amount, donator_email, donator_name,
        payment_method, calendars_given, created_at
      `)
      .eq('status', 'pending')
      .is('receipt_status', null) // Pas encore de reçu
      .not('donator_email', 'is', null) // Email présent
      .gte('amount', 20) // Don minimum pour reçu
      .order('created_at', { ascending: false })
      .limit(50); // Traiter par batch de 50

    if (error || !transactions) {
      console.error('❌ Erreur récupération transactions:', error);
      return { processed: 0, succeeded: 0, failed: 0, details: [] };
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      details: [] as Array<{ transactionId: string; success: boolean; error?: string }>
    };

    for (const transaction of transactions) {
      try {
        const result = await this.processTransactionReceipt(transaction.id);
        
        results.processed++;
        results.details.push({
          transactionId: transaction.id,
          success: result.success,
          error: result.error
        });

        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
        }

        // Délai entre les traitements pour éviter spam
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        results.processed++;
        results.failed++;
        results.details.push({
          transactionId: transaction.id,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`🏁 Traitement terminé: ${results.succeeded}/${results.processed} réussis`);
    return results;
  }

  /**
   * Récupère une transaction avec données enrichies
   */
  private static async getEnrichedTransaction(transactionId: string): Promise<TransactionWithReceipt | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles!inner(full_name, email),
        teams(name)
      `)
      .eq('id', transactionId)
      .single();

    if (error || !data) {
      console.error('Transaction non trouvée:', transactionId, error);
      return null;
    }

    return {
      ...data,
      user_full_name: data.profiles?.full_name || 'Sapeur inconnu',
      team_name: data.teams?.name || undefined
    } as TransactionWithReceipt;
  }

  /**
   * Valide qu'une transaction est éligible pour un reçu
   */
  private static validateTransactionForReceipt(transaction: TransactionWithReceipt): {
    valid: boolean;
    error?: string;
  } {
    // Montant minimum
    if (transaction.amount < 5) {
      return { valid: false, error: 'Montant trop faible pour un reçu' };
    }

    // Email présent
    if (!transaction.donator_email) {
      return { valid: false, error: 'Email donateur manquant' };
    }

    // Email valide (basique)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(transaction.donator_email)) {
      return { valid: false, error: 'Format email invalide' };
    }

    // Nom donateur présent
    if (!transaction.donator_name || transaction.donator_name.trim().length < 2) {
      return { valid: false, error: 'Nom donateur manquant ou invalide' };
    }

    return { valid: true };
  }

  /**
   * Construit les données du reçu à partir d'une transaction
   */
  private static async buildReceiptData(transaction: TransactionWithReceipt): Promise<ReceiptData> {
    // Récupérer les paramètres de l'association
    const { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single();

    // Générer un numéro de reçu unique
    const receiptNumber = this.generateReceiptNumber(transaction);

    const receiptData: ReceiptData = {
      receiptNumber,
      donationDate: new Date(transaction.created_at).toISOString(),
      donatorName: transaction.donator_name || 'Donateur inconnu',
      donatorEmail: transaction.donator_email || '',
      amount: transaction.amount,
      calendarsGiven: transaction.calendars_given,
      paymentMethod: transaction.payment_method,
      sapeurName: transaction.user_full_name || 'Sapeur inconnu',
      teamName: transaction.team_name,
      associationName: settings?.association_name || 'Amicale des Sapeurs-Pompiers',
      associationAddress: settings?.association_address || 'Adresse à compléter',
      associationSiren: settings?.association_siren,
      associationRNA: settings?.association_rna,
      legalText: settings?.legal_text || 'Ce reçu vous est délivré à des fins comptables et justificatives.',
      transactionId: transaction.id,
      templateVersion: settings?.template_version || 'v1',
      quality: 'standard'
    };

    return receiptData;
  }

  /**
   * Génère un numéro de reçu unique
   */
  private static generateReceiptNumber(transaction: TransactionWithReceipt): string {
    const year = new Date(transaction.created_at).getFullYear();
    const month = String(new Date(transaction.created_at).getMonth() + 1).padStart(2, '0');
    const day = String(new Date(transaction.created_at).getDate()).padStart(2, '0');
    
    // Format: RECU-YYYY-MM-DD-XXXXXX (6 derniers chars de l'ID transaction)
    const shortId = transaction.id.slice(-6).toUpperCase();
    
    return `RECU-${year}-${month}-${day}-${shortId}`;
  }

  /**
   * Crée un log email en attente
   */
  private static async createEmailLog(transaction: TransactionWithReceipt, email: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_logs')
        .insert({
          transaction_id: transaction.id,
          email_to: email,
          email_subject: `Reçu de don - ${transaction.donator_name}`,
          status: 'pending',
          receipt_number: this.generateReceiptNumber(transaction)
        });

      if (error) {
        console.warn('⚠️ Erreur création email log:', error);
      }
    } catch (error) {
      console.warn('⚠️ Erreur createEmailLog:', error);
    }
  }

  /**
   * Met à jour le statut de reçu d'une transaction
   */
  private static async updateTransactionReceiptStatus(
    transactionId: string, 
    status: 'pending' | 'generated' | 'failed' | 'sent'
  ): Promise<void> {
    try {
      const updateData: any = {
        receipt_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'generated' || status === 'sent') {
        updateData.receipt_generated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) {
        console.warn('⚠️ Erreur mise à jour receipt_status:', error);
      }
    } catch (error) {
      console.warn('⚠️ Erreur updateTransactionReceiptStatus:', error);
    }
  }

  /**
   * Statistiques des reçus générés
   */
  static async getReceiptStats(): Promise<{
    total: number;
    pending: number;
    generated: number;
    failed: number;
    sent: number;
    todayGenerated: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('receipt_status, receipt_generated_at')
        .not('receipt_status', 'is', null);

      if (error) {
        return { total: 0, pending: 0, generated: 0, failed: 0, sent: 0, todayGenerated: 0 };
      }

      const today = new Date().toISOString().split('T')[0];
      
      const stats = {
        total: data.length,
        pending: data.filter(t => t.receipt_status === 'pending').length,
        generated: data.filter(t => t.receipt_status === 'generated').length,
        failed: data.filter(t => t.receipt_status === 'failed').length,
        sent: data.filter(t => t.receipt_status === 'sent').length,
        todayGenerated: data.filter(t => 
          t.receipt_generated_at && 
          t.receipt_generated_at.startsWith(today)
        ).length
      };

      return stats;
    } catch (error) {
      console.error('Erreur getReceiptStats:', error);
      return { total: 0, pending: 0, generated: 0, failed: 0, sent: 0, todayGenerated: 0 };
    }
  }

  /**
   * Test de bout en bout avec une transaction réelle (mode debug)
   */
  static async testWithRealTransaction(transactionId: string): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      console.log(`🧪 Test complet avec transaction ${transactionId}...`);
      
      const result = await this.processTransactionReceipt(transactionId, {
        autoSend: false, // Mode test, pas d'envoi email
        quality: 'draft'
      });

      console.log('🧪 Résultat test:', result);
      return { success: true, result };

    } catch (error: any) {
      console.error('❌ Erreur test:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ReceiptIntegrationService;