// src/shared/lib/receipt-service.ts - Service intégration n8n + Gotenberg
import { supabase } from '@/shared/lib/supabase';

export interface ReceiptData {
  receiptNumber: string;
  donationDate: string;
  donatorName: string;
  donatorEmail: string;
  amount: number;
  calendarsGiven: number;
  paymentMethod: string;
  sapeurName: string;
  teamName?: string;
  associationName: string;
  associationAddress: string;
  associationSiren?: string;
  associationRNA?: string;
  legalText: string;
  transactionId: string;
  // Gotenberg specifics
  templateVersion?: string;
  quality?: 'draft' | 'standard' | 'high';
}

export interface N8nWorkflowResponse {
  success: boolean;
  workflowId?: string;
  executionId?: string;
  pdfUrl?: string;
  error?: string;
  estimatedProcessingTime?: number;
}

export interface N8nWebhookPayload {
  action: 'generate_and_send_receipt' | 'generate_pdf_only' | 'health_check';
  receipt_data?: ReceiptData;
  options?: {
    send_email: boolean;
    generate_pdf: boolean;
    store_in_supabase: boolean;
    quality: 'draft' | 'standard' | 'high';
    format: 'A4' | 'Letter';
    margins: {
      top: string;
      bottom: string;
      left: string;
      right: string;
    };
  };
  callback_url?: string;
  timestamp: string;
  source: 'sapeurs-pompiers-app';
  version: 'v3';
}

export class ReceiptService {
  private static N8N_WEBHOOK_URL = process.env.N8N_RECEIPT_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  private static N8N_API_KEY = process.env.N8N_API_KEY;
  private static GOTENBERG_URL = process.env.GOTENBERG_URL;
  private static APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  /**
   * Envoie une requête complète (PDF + Email) via n8n workflow
   */
  static async sendReceiptRequest(
    data: ReceiptData, 
    options: Partial<N8nWebhookPayload['options']> = {}
  ): Promise<N8nWorkflowResponse> {
    try {
      if (!this.N8N_WEBHOOK_URL) {
        console.error('❌ N8N_WEBHOOK_URL non configurée');
        return { success: false, error: 'Configuration n8n manquante' };
      }
      
      console.log('📤 Envoi reçu vers n8n workflow...', {
        receiptNumber: data.receiptNumber,
        donatorEmail: data.donatorEmail,
        amount: data.amount,
        sapeur: data.sapeurName
      });
      
      // Préparer le payload pour n8n
      const payload: N8nWebhookPayload = {
        action: 'generate_and_send_receipt',
        receipt_data: {
          ...data,
          quality: options.quality || 'standard'
        },
        options: {
          send_email: true,
          generate_pdf: true,
          store_in_supabase: true,
          quality: options.quality || 'standard',
          format: 'A4',
          margins: {
            top: '20mm',
            bottom: '20mm', 
            left: '20mm',
            right: '20mm'
          },
          ...options
        },
        callback_url: `${this.APP_URL}/api/webhooks/n8n-callback`,
        timestamp: new Date().toISOString(),
        source: 'sapeurs-pompiers-app',
        version: 'v3'
      };
      
      // Headers pour l'authentification n8n
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'User-Agent': 'SapeursPompiers-App/3.0'
      };
      
      if (this.N8N_API_KEY) {
        headers['Authorization'] = `Bearer ${this.N8N_API_KEY}`;
      }
      
      // Envoyer à n8n
      const response = await fetch(this.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        // Timeout de 30 secondes pour n8n
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur n8n webhook:', response.status, errorText);
        throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json() as N8nWorkflowResponse;
      
      console.log('✅ Requête reçu envoyée à n8n:', {
        success: result.success,
        workflowId: result.workflowId || result.executionId,
        processingTime: result.estimatedProcessingTime
      });
      
      // Logger dans Supabase pour traçabilité
      await this.logN8nRequest(data.transactionId, payload, result);
      
      return {
        success: true,
        workflowId: result.workflowId || result.executionId,
        pdfUrl: result.pdfUrl,
        estimatedProcessingTime: result.estimatedProcessingTime
      };
      
    } catch (error: any) {
      console.error('❌ Erreur envoi vers n8n:', error);
      
      // Logger l'erreur
      await this.logN8nRequest(data.transactionId, {
        action: 'generate_and_send_receipt',
        timestamp: new Date().toISOString(),
        source: 'sapeurs-pompiers-app',
        version: 'v3'
      }, { success: false, error: error.message });
      
      return { 
        success: false, 
        error: error.message || 'Erreur communication n8n'
      };
    }
  }

  /**
   * Génère seulement un PDF sans envoi email (pour preview/test)
   */
  static async generatePdfOnly(
    data: ReceiptData,
    quality: 'draft' | 'standard' | 'high' = 'standard'
  ): Promise<N8nWorkflowResponse> {
    return this.sendReceiptRequest(data, {
      send_email: false,
      generate_pdf: true,
      store_in_supabase: true,
      quality
    });
  }

  /**
   * Test de connectivité avec n8n
   */
  static async testN8nConnection(): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      if (!this.N8N_WEBHOOK_URL) {
        return { 
          success: false, 
          error: 'N8N_WEBHOOK_URL non configurée dans les variables d\'environnement' 
        };
      }
      
      console.log('🔍 Test connexion n8n...', this.N8N_WEBHOOK_URL);
      
      // Payload de test minimal
      const testPayload: N8nWebhookPayload = {
        action: 'health_check',
        timestamp: new Date().toISOString(),
        source: 'sapeurs-pompiers-app',
        version: 'v3'
      };
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'User-Agent': 'SapeursPompiers-App/3.0'
      };
      
      if (this.N8N_API_KEY) {
        headers['Authorization'] = `Bearer ${this.N8N_API_KEY}`;
      }
      
      const response = await fetch(this.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10s pour health check
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Test n8n réussi:', result);
        return { success: true, response: result };
      } else {
        console.error('❌ Test n8n échoué:', response.status, result);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${result.message || 'Erreur inconnue'}`,
          response: result
        };
      }
      
    } catch (error: any) {
      console.error('❌ Erreur test n8n:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur de connexion' 
      };
    }
  }

  /**
   * Test avec données complètes de reçu
   */
  static async testReceiptGeneration(): Promise<{ success: boolean; result?: N8nWorkflowResponse; error?: string }> {
    try {
      const testData: ReceiptData = {
        receiptNumber: `TEST-${Date.now()}`,
        donationDate: new Date().toISOString(),
        donatorName: 'Jean Dupont (TEST)',
        donatorEmail: 'test@sapeurs-pompiers.local',
        amount: 25,
        calendarsGiven: 2,
        paymentMethod: 'especes',
        sapeurName: 'Pierre Martin (TEST)',
        teamName: 'Équipe Test',
        associationName: 'Amicale des Sapeurs-Pompiers (TEST)',
        associationAddress: '123 Rue de Test, 34800 Test City',
        associationSiren: '123456789',
        associationRNA: 'W123456789',
        legalText: 'Ceci est un test du système de génération de reçu.',
        transactionId: `test-transaction-${Date.now()}`,
        quality: 'draft'
      };
      
      console.log('🧪 Test génération reçu complet...');
      const result = await this.generatePdfOnly(testData, 'draft');
      
      if (result.success) {
        console.log('✅ Test génération réussi:', result);
        return { success: true, result };
      } else {
        console.error('❌ Test génération échoué:', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error: any) {
      console.error('❌ Erreur test génération:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifier le status d'un workflow n8n en cours
   */
  static async checkWorkflowStatus(workflowId: string): Promise<{
    status: 'running' | 'success' | 'failed' | 'unknown';
    result?: any;
    error?: string;
  }> {
    try {
      if (!workflowId) {
        return { status: 'unknown', error: 'Workflow ID manquant' };
      }
      
      // Note: Implémentation dépendante de l'API n8n disponible
      // Ici on simule, à adapter selon votre setup n8n
      
      console.log('🔍 Vérification status workflow:', workflowId);
      
      // Pour l'instant, retourner "running" car n8n est async
      return { status: 'running' };
      
    } catch (error: any) {
      return { status: 'unknown', error: error.message };
    }
  }

  /**
   * Logger les requêtes n8n dans Supabase pour monitoring
   */
  private static async logN8nRequest(
    transactionId: string,
    payload: Partial<N8nWebhookPayload>,
    response: Partial<N8nWorkflowResponse>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('n8n_workflow_logs')
        .insert({
          transaction_id: transactionId,
          workflow_action: payload.action,
          payload_data: payload,
          response_data: response,
          success: response.success || false,
          workflow_id: response.workflowId || response.executionId,
          error_message: response.error,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('⚠️ Erreur log n8n request:', error);
        // Non bloquant
      }
    } catch (logError) {
      console.warn('⚠️ Erreur logging n8n:', logError);
      // Non bloquant
    }
  }

  /**
   * Configuration et validation de l'environnement
   */
  static validateEnvironment(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!this.N8N_WEBHOOK_URL) {
      missing.push('N8N_WEBHOOK_URL ou NEXT_PUBLIC_N8N_WEBHOOK_URL');
    }

    if (!this.N8N_API_KEY) {
      warnings.push('N8N_API_KEY non définie - authentification désactivée');
    }

    if (!this.GOTENBERG_URL) {
      warnings.push('GOTENBERG_URL non définie - URL par défaut utilisée');
    }

    if (!this.APP_URL.startsWith('https://') && !this.APP_URL.includes('localhost')) {
      warnings.push('APP_URL devrait utiliser HTTPS en production');
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings
    };
  }

  /**
   * Obtenir la configuration actuelle (pour debug)
   */
  static getConfiguration(): {
    n8nUrl: string | undefined;
    hasApiKey: boolean;
    gotenbergUrl: string | undefined;
    appUrl: string;
  } {
    return {
      n8nUrl: this.N8N_WEBHOOK_URL ? 
        this.N8N_WEBHOOK_URL.replace(/\/[^\/]*$/, '/***') : // Masquer le token
        undefined,
      hasApiKey: !!this.N8N_API_KEY,
      gotenbergUrl: this.GOTENBERG_URL,
      appUrl: this.APP_URL
    };
  }
}

export default ReceiptService;