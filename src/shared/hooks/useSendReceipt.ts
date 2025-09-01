// src/shared/hooks/useSendReceipt.ts - Hook pour utiliser l'API send-receipt

import { useState, useCallback } from 'react';

interface SendReceiptOptions {
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

interface SendReceiptResponse {
  success: boolean;
  receiptNumber?: string;
  emailTo?: string;
  workflowId?: string;
  executionId?: string;
  message?: string;
  estimatedProcessingTime?: number;
  quality?: string;
  sendEmail?: boolean;
  transactionId?: string;
  timestamp?: string;
  fromCache?: boolean;
  cachedAt?: string;
  isExisting?: boolean;
  lastSent?: string;
  status?: string;
  error?: string;
  details?: string;
  suggestion?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  version?: string;
  environment?: string;
  checks: {
    n8nConnection: any;
    storage: any;
    database: boolean;
    configuration: any;
  };
  stats: {
    cache: {
      size: number;
      maxSize: number;
      utilizationPercent: number;
    };
    email24h: Record<string, number>;
    recentTransactions: number;
  };
  configuration: any;
  endpoints: Record<string, string>;
}

export const useSendReceipt = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SendReceiptResponse | null>(null);

  /**
   * Envoie un reçu pour une transaction
   */
  const sendReceipt = useCallback(async (
    transactionId: string,
    options: SendReceiptOptions = {}
  ): Promise<SendReceiptResponse> => {
    setIsLoading(true);
    
    try {
      console.log('📧 Envoi reçu via API:', transactionId, options);
      
      const response = await fetch('/api/donations/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          ...options
        })
      });

      const result: SendReceiptResponse = await response.json();
      
      if (!response.ok) {
        result.success = false;
        result.error = result.error || `HTTP ${response.status}`;
      }
      
      setLastResult(result);
      return result;
      
    } catch (error: any) {
      const errorResult: SendReceiptResponse = {
        success: false,
        error: 'Erreur réseau',
        details: error.message
      };
      
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Test rapide avec paramètres par défaut
   */
  const sendReceiptQuick = useCallback(async (transactionId: string): Promise<SendReceiptResponse> => {
    return sendReceipt(transactionId, {
      options: { quality: 'standard', sendEmail: true }
    });
  }, [sendReceipt]);

  /**
   * Renvoie un reçu
   */
  const resendReceipt = useCallback(async (
    transactionId: string,
    options: Omit<SendReceiptOptions, 'resend'> = {}
  ): Promise<SendReceiptResponse> => {
    return sendReceipt(transactionId, {
      ...options,
      resend: true
    });
  }, [sendReceipt]);

  /**
   * Génère un PDF de test sans envoi email
   */
  const generateTestPDF = useCallback(async (transactionId: string): Promise<SendReceiptResponse> => {
    return sendReceipt(transactionId, {
      options: { 
        quality: 'draft', 
        sendEmail: false 
      }
    });
  }, [sendReceipt]);

  /**
   * Health check de l'API
   */
  const checkHealth = useCallback(async (): Promise<HealthCheckResponse> => {
    try {
      const response = await fetch('/api/donations/send-receipt', {
        method: 'GET'
      });

      const result = await response.json();
      return result;
      
    } catch (error: any) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          n8nConnection: { success: false, error: 'Network error' },
          storage: { healthy: false, error: 'Network error' },
          database: false,
          configuration: { valid: false, error: 'Network error' }
        },
        stats: {
          cache: { size: 0, maxSize: 0, utilizationPercent: 0 },
          email24h: {},
          recentTransactions: 0
        },
        configuration: {},
        endpoints: {}
      };
    }
  }, []);

  /**
   * Vide le cache d'idempotence
   */
  const clearCache = useCallback(async (force: boolean = false): Promise<{
    success: boolean;
    message?: string;
    itemsCleared?: number;
    remainingItems?: number;
    error?: string;
  }> => {
    try {
      const url = force ? '/api/donations/send-receipt?force=true' : '/api/donations/send-receipt';
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      return await response.json();
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }, []);

  return {
    // État
    isLoading,
    lastResult,
    
    // Actions principales
    sendReceipt,
    sendReceiptQuick,
    resendReceipt,
    generateTestPDF,
    
    // Monitoring et maintenance
    checkHealth,
    clearCache,
    
    // Helpers
    isSuccess: (result: SendReceiptResponse) => result.success,
    isFromCache: (result: SendReceiptResponse) => result.fromCache === true,
    isExisting: (result: SendReceiptResponse) => result.isExisting === true,
  };
};

export default useSendReceipt;