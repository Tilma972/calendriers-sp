// src/shared/services/storageService.ts - Service de stockage et logs Supabase
import { supabase } from '@/shared/lib/supabase';

export interface EmailLogData {
  transactionId: string;
  emailTo: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'delivered' | 'opened';
  errorMessage?: string;
  receiptNumber?: string;
  emailProvider?: string;
  userAgent?: string;
}

export interface EmailLogStats {
  totalSent: number;
  successfulSent: number;
  failedSent: number;
  bouncedSent: number;
  openedCount: number;
  clickedCount: number;
  openRatePercent: number;
  dateSent: string;
}

// Small helpers for conservative runtime-safe conversions
interface StorageBucket { name?: string }
interface LogRow { id?: string }
const asNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export class ReceiptStorageService {
  private static readonly BUCKET_NAME = 'receipts';
  private static readonly PDF_FOLDER = 'pdf-receipts';
  
  /**
   * Initialise le bucket de stockage si nécessaire
   */
  static async initializeBucket(): Promise<void> {
    try {
      // Vérifier si le bucket existe
  const bucketsResp = await supabase.storage.listBuckets();
  const buckets = (bucketsResp?.data ?? []) as StorageBucket[];
  const bucketExists = buckets.some((bucket) => bucket?.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        // Créer le bucket
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false, // Accès sécurisé uniquement
          fileSizeLimit: 10 * 1024 * 1024, // 10MB max par fichier
          allowedMimeTypes: ['application/pdf', 'text/html']
        });
        
        if (error) {
          console.error('Erreur création bucket:', error);
          throw error;
        }
        
        console.log(`✅ Bucket '${this.BUCKET_NAME}' créé avec succès`);
      }
    } catch (error) {
      console.error('Erreur initialisation bucket:', error);
      // Ne pas faire échouer le système si le bucket existe déjà
    }
  }

  /**
   * Upload un PDF de reçu dans Supabase Storage
   */
  static async uploadReceiptPDF(pdfBuffer: Buffer, receiptNumber: string): Promise<string> {
    try {
      await this.initializeBucket();
      
      const fileName = `${receiptNumber}.pdf`;
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const filePath = `${this.PDF_FOLDER}/${year}/${month}/${fileName}`;
      
      // Upload le fichier
      const uploadResp = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false, // Éviter l'écrasement
          metadata: {
            receiptNumber,
            uploadedAt: new Date().toISOString(),
            fileType: 'receipt_pdf'
          }
        });
      
      if (uploadResp.error) {
        throw new Error(`Erreur upload PDF: ${uploadResp.error?.message ?? String(uploadResp.error)}`);
      }
      
      // Générer URL signée pour accès sécurisé (expire dans 1 an)
      const signedResp = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 an

      if (signedResp.error) {
        console.warn('Erreur génération URL signée:', signedResp.error);
        // Fallback: URL publique (si bucket public)
        const publicResp = await supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(filePath);
        const publicUrl = publicResp?.data?.publicUrl ?? '';
        return publicUrl;
      }

  const signedUrl = signedResp?.data?.signedUrl ?? '';
      console.log(`✅ PDF uploadé: ${fileName}`);
      return signedUrl;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur upload PDF:', message);
      throw new Error(`Échec upload PDF: ${message}`);
    }
  }

  /**
   * Upload le HTML du reçu pour archivage
   */
  static async uploadReceiptHTML(htmlContent: string, receiptNumber: string): Promise<string> {
    try {
      await this.initializeBucket();
      
      const fileName = `${receiptNumber}.html`;
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const filePath = `html-receipts/${year}/${month}/${fileName}`;
      
      const uploadResp = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, htmlContent, {
          contentType: 'text/html; charset=utf-8',
          upsert: false,
          metadata: {
            receiptNumber,
            uploadedAt: new Date().toISOString(),
            fileType: 'receipt_html'
          }
        });
      
      if (uploadResp.error) {
        throw new Error(`Erreur upload HTML: ${uploadResp.error?.message ?? String(uploadResp.error)}`);
      }
      
      const signedResp = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 365 * 24 * 60 * 60);

  const signedUrl = signedResp?.data?.signedUrl ?? '';
      console.log(`✅ HTML archivé: ${fileName}`);
      return signedUrl;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur upload HTML:', message);
      // Non critique, ne pas faire échouer le processus
      return '';
    }
  }

  /**
   * Supprime un fichier de reçu (pour RGPD)
   */
  static async deleteReceipt(receiptNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Supprimer PDF et HTML
      const files = [
        `${this.PDF_FOLDER}/${year}/${month}/${receiptNumber}.pdf`,
        `html-receipts/${year}/${month}/${receiptNumber}.html`
      ];
      
      const removeResp = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove(files);
      
      if (removeResp.error) {
        return { success: false, error: removeResp.error?.message ?? String(removeResp.error) };
      }
      
      console.log(`✅ Reçu supprimé: ${receiptNumber}`);
      return { success: true };
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}

export class EmailLogService {
  
  /**
   * Crée un log d'email
   */
  static async createEmailLog(data: EmailLogData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const emailProvider = this.detectEmailProvider(data.emailTo);
      
      const { data: result, error } = await supabase
        .from('email_logs')
        .insert({
          transaction_id: data.transactionId,
          email_to: data.emailTo,
          email_subject: data.subject,
          status: data.status,
          error_message: data.errorMessage,
          receipt_number: data.receiptNumber,
          email_provider: emailProvider,
          user_agent: data.userAgent,
          sent_at: data.status === 'sent' ? new Date().toISOString() : null,
          delivered_at: data.status === 'delivered' ? new Date().toISOString() : null
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Erreur création email log:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, id: result?.id };
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur email log:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Met à jour un log d'email existant
   */
  static async updateEmailLog(
    logId: string, 
    updates: Partial<Pick<EmailLogData, 'status' | 'errorMessage'>> & {
      deliveredAt?: string;
      openedAt?: string;
      clickedAt?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
  const updateData: Record<string, unknown> = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.errorMessage) updateData.error_message = updates.errorMessage;
      if (updates.deliveredAt) updateData.delivered_at = updates.deliveredAt;
      if (updates.openedAt) updateData.opened_at = updates.openedAt;
      if (updates.clickedAt) updateData.clicked_at = updates.clickedAt;
      
      // Auto-set delivered_at for 'delivered' status
      if (updates.status === 'delivered' && !updates.deliveredAt) {
        updateData.delivered_at = new Date().toISOString();
      }
      
      // Auto-set opened_at for 'opened' status
      if (updates.status === 'opened' && !updates.openedAt) {
        updateData.opened_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('email_logs')
        .update(updateData)
        .eq('id', logId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Récupère les logs d'email pour une transaction
   */
  static async getEmailLogsForTransaction(transactionId: string): Promise<unknown[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erreur récupération logs:', error);
        return [];
      }
      
      return Array.isArray(data) ? data : [];
      
    } catch (error: unknown) {
      console.error('Erreur logs transaction:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Récupère les statistiques d'emails
   */
  static async getEmailStats(days: number = 30): Promise<EmailLogStats[]> {
    try {
      const statsResp = await supabase
        .from('email_stats')
        .select('*')
        .gte('date_sent', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('date_sent', { ascending: false });

      if (statsResp.error) {
        console.error('Erreur récupération stats:', statsResp.error);
        return [];
      }

      const rows = Array.isArray(statsResp.data) ? statsResp.data : [];
      return rows.map((r: Record<string, unknown>) => ({
        totalSent: asNumber(r.total_sent),
        successfulSent: asNumber(r.successful_sent),
        failedSent: asNumber(r.failed_sent),
        bouncedSent: asNumber(r.bounced_sent),
        openedCount: asNumber(r.opened_count),
        clickedCount: asNumber(r.clicked_count),
        openRatePercent: asNumber(r.open_rate_percent),
        dateSent: (r.date_sent as string) ?? ''
      } as EmailLogStats));
      
    } catch (error: unknown) {
      console.error('Erreur stats email:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Marque un email comme ouvert (pour tracking)
   */
  static async trackEmailOpen(receiptNumber: string): Promise<void> {
    try {
      // Trouver le log correspondant
      const logsResp = await supabase
        .from('email_logs')
        .select('id')
        .eq('receipt_number', receiptNumber)
        .eq('status', 'sent')
        .limit(1);
      const logs = (Array.isArray(logsResp?.data) ? logsResp.data : []) as LogRow[];

      if (logs.length > 0) {
        await this.updateEmailLog(logs[0].id ?? '', {
          status: 'opened',
          openedAt: new Date().toISOString()
        });
        
        console.log(`📧 Email ouvert tracké: ${receiptNumber}`);
      }
      
    } catch (error: unknown) {
      console.error('Erreur tracking ouverture:', error instanceof Error ? error.message : String(error));
      // Non critique, ne pas faire échouer
    }
  }

  /**
   * Détecte le provider d'email depuis l'adresse
   */
  private static detectEmailProvider(email: string): string {
    const domain = email.split('@')[1]?.toLowerCase();
    
    const providers: { [key: string]: string } = {
      'gmail.com': 'Gmail',
      'googlemail.com': 'Gmail',
      'outlook.com': 'Outlook',
      'hotmail.com': 'Hotmail',
      'live.com': 'Outlook Live',
      'yahoo.com': 'Yahoo',
      'yahoo.fr': 'Yahoo France',
      'orange.fr': 'Orange',
      'wanadoo.fr': 'Orange',
      'free.fr': 'Free',
      'sfr.fr': 'SFR',
      'laposte.net': 'La Poste',
      'icloud.com': 'iCloud'
    };
    
    return providers[domain] || domain || 'Inconnu';
  }

  /**
   * Nettoie les vieux logs (pour performance et RGPD)
   */
  static async cleanOldLogs(olderThanDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const delResp = await supabase
        .from('email_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (delResp.error) {
        console.error('Erreur nettoyage logs:', delResp.error);
        return 0;
      }

  const delData = Array.isArray(delResp?.data) ? (delResp.data as unknown[]) : [];
  const deletedCount = delData.length;
      console.log(`🧹 ${deletedCount} logs supprimés (plus de ${olderThanDays} jours)`);
      
      return deletedCount;
      
    } catch (error) {
      console.error('Erreur nettoyage:', error);
      return 0;
    }
  }
}

const Services = { ReceiptStorageService, EmailLogService };
export default Services;