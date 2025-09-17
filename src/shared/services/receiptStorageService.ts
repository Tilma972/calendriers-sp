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
  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
}

export interface ReceiptStorageData {
  transactionId: string;
  receiptNumber: string;
  pdfUrl?: string;
  storageProvider?: 'supabase' | 'aws' | 'local';
  storagePath?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
}

export class ReceiptStorageService {
  private static getAdminClient(): SupabaseClient<unknown> {
    if (!supabaseAdmin) throw new Error('Client Admin Supabase non initialisé.');
    return supabaseAdmin as SupabaseClient<unknown>;
  }

  static async createEmailLog(data: EmailLogData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const row = {
        transaction_id: data.transactionId,
        email_to: data.emailTo,
        email_subject: data.subject,
        status: data.status,
        error_message: data.errorMessage || null,
        receipt_number: data.receiptNumber || null,
        user_agent: data.userAgent || null,
        sent_at: data.sentAt ?? null,
        delivered_at: data.deliveredAt ?? null,
        opened_at: data.openedAt ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

  const { data: result, error } = await supabase.from('email_logs').insert(row).select('id').single();
  if (error) return { success: false, error: String(error) };
  const typedResult = result as { id?: string } | null;
  return { success: true, id: typedResult?.id };
    } catch (err: unknown) {
      if (err instanceof Error) return { success: false, error: err.message };
      return { success: false, error: String(err) };
    }
  }

  /**
   * Vérifie si un reçu (log) existe déjà pour une transaction donnée.
   * Retourne un objet conservateur utilisé par l'API appelante.
   */
  static async checkReceiptExists(transactionId: string): Promise<{ exists: boolean; receiptNumber?: string | null; lastSent?: string | null; status?: string | null; error?: string | null }> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('receipt_number, sent_at, status, error_message, created_at')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false })
        .limit(1 as number);

      if (error) return { exists: false, error: String(error) };

      const row = Array.isArray(data) && data.length > 0 ? data[0] as Record<string, unknown> : null;
      if (!row) return { exists: false };

      return {
        exists: true,
        receiptNumber: row['receipt_number'] == null ? null : String(row['receipt_number']),
        lastSent: row['sent_at'] == null ? null : String(row['sent_at']),
        status: row['status'] == null ? null : String(row['status']),
        error: row['error_message'] == null ? null : String(row['error_message'])
      };
    } catch (err: unknown) {
      if (err instanceof Error) return { exists: false, error: err.message };
      return { exists: false, error: String(err) };
    }
  }

  /**
   * Met à jour le log email le plus récent pour une transaction donnée.
   * Reçoit des champs similaires à `EmailLogData` en camelCase et mappe vers les colonnes DB.
   */
  static async updateEmailLog(transactionId: string, updates: Partial<EmailLogData & { sentAt?: string; deliveredAt?: string; openedAt?: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      // Récupérer l'enregistrement le plus récent pour cette transaction
      const { data: rows, error: selectError } = await supabase
        .from('email_logs')
        .select('id')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false })
        .limit(1 as number);

      if (selectError) return { success: false, error: String(selectError) };
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] as Record<string, unknown> : null;
      if (!row || !row.id) return { success: false, error: 'Aucun log trouvé pour cette transaction' };

      const mapped: Record<string, unknown> = {};
      if (updates.status) mapped.status = updates.status;
      if (updates.errorMessage) mapped.error_message = updates.errorMessage;
      if (updates.receiptNumber) mapped.receipt_number = updates.receiptNumber;
      if (updates.sentAt) mapped.sent_at = updates.sentAt;
      if (updates.deliveredAt) mapped.delivered_at = updates.deliveredAt;
      if (updates.openedAt) mapped.opened_at = updates.openedAt;
      mapped.updated_at = new Date().toISOString();

  const rowId = String(row.id);
  const { error: updateError } = await supabase.from('email_logs').update(mapped).eq('id', rowId);
      if (updateError) return { success: false, error: String(updateError) };
      return { success: true };
    } catch (err: unknown) {
      if (err instanceof Error) return { success: false, error: err.message };
      return { success: false, error: String(err) };
    }
  }

  /**
   * Upload a PDF buffer to Supabase storage under a receipts/ path and return public URL.
   * Conservative implementation: uses admin client and default bucket 'receipts'.
   */
  static async uploadReceiptPDF(pdfBuffer: Buffer, receiptNumber: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
      const admin = this.getAdminClient();
      const bucket = 'receipts';
      const filePath = `receipts/${receiptNumber}.pdf`;

      // Ensure bucket exists is out of scope; assume it exists.
      const { error: uploadError } = await admin.storage.from(bucket).upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true as boolean });
      if (uploadError) return { success: false, error: String(uploadError) };

      // Generate public URL (this returns a URL even if bucket is private in some setups)
      try {
        const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(filePath);
        return { success: true, publicUrl: publicUrlData.publicUrl };
      } catch (err: unknown) {
        if (err instanceof Error) return { success: true, publicUrl: undefined, error: err.message };
        return { success: true, publicUrl: undefined, error: String(err) };
      }
    } catch (err: unknown) {
      if (err instanceof Error) return { success: false, error: err.message };
      return { success: false, error: String(err) };
    }
  }

  static async getEmailStats24h(): Promise<{ success: boolean; stats?: Record<string, number>; error?: string }> {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from('email_logs').select('status').gte('created_at', since);
      if (error) return { success: false, error: String(error) };

      const stats = (data || []).reduce((acc: Record<string, number>, row: Record<string, unknown>) => {
        const status = typeof row.status === 'string' ? row.status : String(row.status ?? 'unknown');
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { success: true, stats };
    } catch (err: unknown) {
      if (err instanceof Error) return { success: false, error: err.message };
      return { success: false, error: String(err) };
    }
  }

  static async healthCheck(): Promise<{ healthy: boolean; checks: { database: boolean; storage: boolean; recentActivity: boolean }; stats?: Record<string, number>; error?: string }> {
    try {
      const checks = { database: false, storage: false, recentActivity: false };

      try {
        const admin = this.getAdminClient();
        const { error } = await admin.from('email_logs').select('id').limit(1);
        checks.database = !error;
      } catch {
        checks.database = false;
      }

      try {
        const admin = this.getAdminClient();
        const { data: buckets, error } = await admin.storage.listBuckets();
        checks.storage = !error && buckets !== null;
      } catch {
        checks.storage = false;
      }

      const statsResult = await this.getEmailStats24h();
      if (statsResult.success && statsResult.stats) {
        const totalActivity = Object.values(statsResult.stats).reduce((a, b) => a + b, 0);
        checks.recentActivity = totalActivity > 0;
      }

      const healthy = checks.database && checks.storage;
      return { healthy, checks, stats: statsResult.stats, error: healthy ? undefined : 'Certains composants ne sont pas opérationnels' };
    } catch (err: unknown) {
      if (err instanceof Error) return { healthy: false, checks: { database: false, storage: false, recentActivity: false }, error: err.message };
      return { healthy: false, checks: { database: false, storage: false, recentActivity: false }, error: String(err) };
    }
  }
}

export default ReceiptStorageService;
