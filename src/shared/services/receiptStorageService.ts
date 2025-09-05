// src/shared/services/receiptStorageService.ts - Service de stockage et logs des reçus

import { supabase, supabaseAdmin } from '@/shared/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface EmailLogData {
  transactionId: string;
  emailTo: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'delivered' | 'opened';
  errorMessage?: string;
  receiptNumber?: string;
  userAgent?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
}

export interface ReceiptStorageData {
  transactionId: string;
  receiptNumber: string;
  pdfUrl?: string;
  storageProvider?: 'supabase' | 'aws' | 'local';
  storagePath?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

/**
 * Service pour gérer le stockage des reçus et logs associés
 */
export class ReceiptStorageService {
  
  // Fonction de vérification interne
  private static getAdminClient(): SupabaseClient<any> {
    if (!supabaseAdmin) {
      throw new Error('Client Admin Supabase non initialisé. Vérifiez SUPABASE_SERVICE_ROLE_KEY.');
    }
    return supabaseAdmin;
  }

  /**
   * Crée un log d'email dans la base de données
   */
  static async createEmailLog(data: EmailLogData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const logData = {
        transaction_id: data.transactionId,
        email_to: data.emailTo,
        email_subject: data.subject,
        status: data.status,
        error_message: data.errorMessage || null,
        receipt_number: data.receiptNumber || null,
        user_agent: data.userAgent || null,
        sent_at: data.sentAt || (data.status === 'sent' ? new Date().toISOString() : null),
        delivered_at: data.deliveredAt || null,
        opened_at: data.openedAt || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('email_logs')
        .insert(logData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Erreur création email log:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Email log créé: ${result.id} (${data.status})`);
      return { success: true, id: result.id };

    } catch (error: any) {
      console.error('❌ Erreur createEmailLog:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour un log d'email existant
   */
  static async updateEmailLog(
    transactionId: string,
    updates: Partial<EmailLogData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.status) updateData.status = updates.status;
      if (updates.errorMessage) updateData.error_message = updates.errorMessage;
      if (updates.sentAt) updateData.sent_at = updates.sentAt;
      if (updates.deliveredAt) updateData.delivered_at = updates.deliveredAt;
      if (updates.openedAt) updateData.opened_at = updates.openedAt;

      const { error } = await supabase
        .from('email_logs')
        .update(updateData)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Erreur mise à jour email log:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Email log mis à jour: ${transactionId} → ${updates.status}`);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erreur updateEmailLog:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère les logs d'email pour une transaction
   */
  static async getEmailLogs(transactionId: string): Promise<{
    success: boolean;
    logs?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, logs: data || [] };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Stocke les métadonnées d'un reçu PDF
   */
  static async storeReceiptData(data: ReceiptStorageData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Pour l'instant, on met à jour la transaction avec l'URL du PDF
      // Plus tard, on pourrait créer une table séparée "receipt_storage"
      const updateData: any = {
        receipt_number: data.receiptNumber,
        receipt_url: data.pdfUrl,
        updated_at: new Date().toISOString()
      };

      // Ajouter des métadonnées si disponibles
      if (data.metadata) {
        updateData.receipt_metadata = data.metadata;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', data.transactionId);

      if (error) {
        console.error('❌ Erreur stockage reçu:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Données reçu stockées: ${data.receiptNumber}`);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erreur storeReceiptData:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie si un reçu a déjà été envoyé pour une transaction
   */
  static async checkReceiptExists(transactionId: string): Promise<{
    exists: boolean;
    receiptNumber?: string;
    lastSent?: string;
    status?: string;
    error?: string;
  }> {
    try {
      // Vérifier dans les logs d'email
      const { data: emailLogs, error: emailError } = await supabase
        .from('email_logs')
        .select('receipt_number, created_at, status')
        .eq('transaction_id', transactionId)
        .in('status', ['sent', 'delivered', 'opened'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (emailError) {
        return { exists: false, error: emailError.message };
      }

      if (emailLogs && emailLogs.length > 0) {
        const log = emailLogs[0];
        return {
          exists: true,
          receiptNumber: log.receipt_number || undefined,
          lastSent: log.created_at || undefined,
          status: log.status || undefined
        };
      }

      // Vérifier dans la transaction elle-même
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('receipt_number')
        .eq('id', transactionId)
        .single();

      if (transactionError) {
        return { exists: false, error: transactionError.message };
      }

      return {
        exists: !!transaction?.receipt_number,
        receiptNumber: transaction?.receipt_number || undefined,
        lastSent: undefined
      };

    } catch (error: any) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Récupère les statistiques des emails des dernières 24h
   */
  static async getEmailStats24h(): Promise<{
    success: boolean;
    stats?: Record<string, number>;
    error?: string;
  }> {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('email_logs')
        .select('status')
        .gte('created_at', since);

      if (error) {
        return { success: false, error: error.message };
      }

      const stats = (data || []).reduce((acc, row) => {
        if (row.status) {
          acc[row.status] = (acc[row.status] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return { success: true, stats };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Nettoyage des anciens logs (plus de 6 mois)
   */
  static async cleanupOldLogs(): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('email_logs')
        .delete()
        .lt('created_at', sixMonthsAgo.toISOString())
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      const deletedCount = Array.isArray(data) ? data.length : 0;
      console.log(`🧹 Logs nettoyés: ${deletedCount} entrées supprimées`);

      return { success: true, deletedCount };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialise le bucket de stockage des reçus
   */
  static async initializeBucket(): Promise<void> {
    try {
      const admin = this.getAdminClient();
      const { data: buckets } = await admin.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'receipts');
      
      if (!bucketExists) {
        const { error } = await admin.storage.createBucket('receipts', {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB max
          allowedMimeTypes: ['application/pdf', 'text/html']
        });
        
        if (error) throw error;
        console.log('✅ Bucket receipts créé');
      }
    } catch (error: any) {
      console.error('❌ Erreur initialisation bucket:', error);
      throw error;
    }
  }

  /**
   * Upload un PDF de reçu dans le stockage Supabase
   */
  static async uploadReceiptPDF(pdfBuffer: Buffer, receiptNumber: string): Promise<{
    success: boolean;
    publicUrl?: string;
    signedUrl?: string;
    error?: string;
  }> {
    try {
      const admin = this.getAdminClient();
      await this.initializeBucket();
      
      const fileName = `${receiptNumber}.pdf`;
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const filePath = `pdf-receipts/${year}/${month}/${fileName}`;

      console.log('💾 Upload PDF:', { fileName, filePath, bufferSize: pdfBuffer.length });

      const { data, error } = await admin.storage
        .from('receipts')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
          metadata: {
            receiptNumber,
            uploadedAt: new Date().toISOString(),
            fileType: 'receipt_pdf'
          }
        });

      if (error) {
        console.error('❌ Erreur upload PDF:', error);
        throw new Error(`Erreur upload PDF: ${error.message}`);
      }

      // Générer URL publique
      const { data: urlData } = admin.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Générer URL signée sécurisée (valide 1 an)
      const { data: signedData } = await admin.storage
        .from('receipts')
        .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 an

      console.log('✅ PDF uploadé avec succès:', { 
        path: filePath, 
        publicUrl: urlData.publicUrl,
        hasSignedUrl: !!signedData?.signedUrl 
      });

      return { 
        success: true, 
        publicUrl: urlData.publicUrl,
        signedUrl: signedData?.signedUrl || urlData.publicUrl
      };

    } catch (error: any) {
      console.error('❌ Erreur uploadReceiptPDF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère un PDF de reçu depuis le stockage
   */
  static async getReceiptPDF(receiptNumber: string): Promise<{
    success: boolean;
    signedUrl?: string;
    error?: string;
  }> {
    try {
      const admin = this.getAdminClient();
      // Chercher le fichier dans la structure hiérarchique
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Essayer d'abord le mois/année courant
      let filePath = `pdf-receipts/${currentYear}/${currentMonth}/${receiptNumber}.pdf`;
      
      let { data: signedData, error } = await admin.storage
        .from('receipts')
        .createSignedUrl(filePath, 60 * 60); // 1 heure

      // Si pas trouvé, chercher dans les autres mois de l'année courante
      if (error) {
        for (let month = 1; month <= 12; month++) {
          const monthStr = String(month).padStart(2, '0');
          filePath = `pdf-receipts/${currentYear}/${monthStr}/${receiptNumber}.pdf`;
          
          const result = await admin.storage
            .from('receipts')
            .createSignedUrl(filePath, 60 * 60);
          
          if (!result.error && result.data?.signedUrl) {
            signedData = result.data;
            error = null;
            break;
          }
        }
      }

      if (error || !signedData?.signedUrl) {
        return { success: false, error: `Reçu PDF non trouvé: ${receiptNumber}` };
      }

      return { success: true, signedUrl: signedData.signedUrl };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprime un PDF de reçu du stockage
   */
  static async deleteReceiptPDF(receiptNumber: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const admin = this.getAdminClient();
      // Chercher et supprimer le fichier
      const currentYear = new Date().getFullYear();
      
      for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const filePath = `pdf-receipts/${currentYear}/${monthStr}/${receiptNumber}.pdf`;
        
        const { error } = await admin.storage
          .from('receipts')
          .remove([filePath]);
        
        if (!error) {
          console.log(`✅ PDF supprimé: ${filePath}`);
          return { success: true };
        }
      }

      return { success: false, error: `Reçu PDF non trouvé pour suppression: ${receiptNumber}` };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie la santé du système de stockage
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    checks: {
      database: boolean;
      storage: boolean;
      recentActivity: boolean;
    };
    stats?: Record<string, number>;
    error?: string;
  }> {
    try {
      const checks = {
        database: false,
        storage: false,
        recentActivity: false
      };

      // Test base de données
      try {
        const admin = this.getAdminClient();
        const { error: dbError } = await admin
          .from('email_logs')
          .select('id')
          .limit(1);
        checks.database = !dbError;
      } catch {
        checks.database = false;
      }

      // Test stockage Supabase
      try {
        const admin = this.getAdminClient();
        const { data: buckets, error: storageError } = await admin.storage.listBuckets();
        checks.storage = !storageError && buckets !== null;
      } catch {
        checks.storage = false;
      }

      // Vérifier activité récente (dernières 24h)
      const statsResult = await this.getEmailStats24h();
      if (statsResult.success && statsResult.stats) {
        const totalActivity = Object.values(statsResult.stats).reduce((a, b) => a + b, 0);
        checks.recentActivity = totalActivity > 0;
      }

      const healthy = checks.database && checks.storage;

      return {
        healthy,
        checks,
        stats: statsResult.stats,
        error: healthy ? undefined : 'Certains composants ne sont pas opérationnels'
      };

    } catch (error: any) {
      return {
        healthy: false,
        checks: { database: false, storage: false, recentActivity: false },
        error: error.message
      };
    }
  }
}

export default ReceiptStorageService;
