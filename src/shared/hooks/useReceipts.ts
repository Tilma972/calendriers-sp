// src/shared/hooks/useReceipts.ts - Hook React pour gestion des reçus

import { useState, useCallback, useEffect } from 'react';
import { ReceiptIntegrationService } from '@/shared/services/receiptIntegrationService';
import { ReceiptService } from '@/shared/lib/receipt-service';

interface ReceiptStats {
  total: number;
  pending: number;
  generated: number;
  failed: number;
  sent: number;
  todayGenerated: number;
}

interface ReceiptGenerationResult {
  success: boolean;
  error?: string;
  workflowId?: string;
  pdfUrl?: string;
}

export const useReceipts = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [stats, setStats] = useState<ReceiptStats>({
    total: 0,
    pending: 0,
    generated: 0,
    failed: 0,
    sent: 0,
    todayGenerated: 0
  });

  /**
   * Génère un reçu pour une transaction
   */
  const generateReceipt = useCallback(async (
    transactionId: string,
    options: {
      autoSend?: boolean;
      quality?: 'draft' | 'standard' | 'high';
    } = {}
  ): Promise<ReceiptGenerationResult> => {
    setIsGenerating(true);
    
    try {
      const result = await ReceiptIntegrationService.processTransactionReceipt(
        transactionId, 
        options
      );
      
      // Rafraîchir les stats après génération
      await refreshStats();
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur inconnue'
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Génère un reçu de test (PDF seulement)
   */
  const generateTestReceipt = useCallback(async (): Promise<ReceiptGenerationResult> => {
    setIsGenerating(true);
    
    try {
      const result = await ReceiptService.testReceiptGeneration();
      
      if (result.success && result.result) {
        return result.result;
      } else {
        return {
          success: false,
          error: result.error || 'Erreur test génération'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur test'
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Traite tous les reçus en attente
   */
  const processPendingReceipts = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const result = await ReceiptIntegrationService.processPendingReceipts();
      
      // Rafraîchir les stats après traitement
      await refreshStats();
      
      return result;
    } catch (error: any) {
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Test de connexion n8n
   */
  const testN8nConnection = useCallback(async () => {
    setIsTestingConnection(true);
    
    try {
      const result = await ReceiptService.testN8nConnection();
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur test connexion'
      };
    } finally {
      setIsTestingConnection(false);
    }
  }, []);

  /**
   * Récupère les statistiques des reçus
   */
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await ReceiptIntegrationService.getReceiptStats();
      setStats(newStats);
      return newStats;
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      return stats; // Retourner les stats actuelles en cas d'erreur
    }
  }, [stats]);

  /**
   * Valide la configuration n8n
   */
  const validateConfiguration = useCallback(async () => {
    try {
      const config = ReceiptService.getConfiguration();
      const validation = ReceiptService.validateEnvironment();
      
      return {
        configuration: config,
        validation,
        isValid: validation.valid
      };
    } catch (error: any) {
      return {
        configuration: null,
        validation: { valid: false, missing: ['Erreur inconnue'], warnings: [] },
        isValid: false,
        error: error.message
      };
    }
  }, []);

  /**
   * Test avec une vraie transaction (mode debug)
   */
  const testWithRealTransaction = useCallback(async (transactionId: string) => {
    setIsGenerating(true);
    
    try {
      const result = await ReceiptIntegrationService.testWithRealTransaction(transactionId);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur test transaction'
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Charger les stats au montage du hook
  useEffect(() => {
    refreshStats();
  }, []);

  return {
    // États
    isGenerating,
    isTestingConnection,
    stats,
    
    // Actions de base
    generateReceipt,
    generateTestReceipt,
    processPendingReceipts,
    
    // Tests et diagnostics
    testN8nConnection,
    testWithRealTransaction,
    validateConfiguration,
    
    // Utilitaires
    refreshStats,
    
    // État de santé
    isHealthy: stats.total > 0 && stats.failed / Math.max(stats.total, 1) < 0.2 // < 20% d'échecs
  };
};

/**
 * Hook simplifié pour les composants qui ont juste besoin des stats
 */
export const useReceiptStats = () => {
  const [stats, setStats] = useState<ReceiptStats>({
    total: 0,
    pending: 0,
    generated: 0,
    failed: 0,
    sent: 0,
    todayGenerated: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStats = await ReceiptIntegrationService.getReceiptStats();
      setStats(newStats);
    } catch (error) {
      console.error('Erreur récupération stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    
    // Rafraîchissement automatique toutes les 30 secondes
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    isLoading,
    refreshStats,
    successRate: stats.total > 0 ? Math.round((stats.generated + stats.sent) / stats.total * 100) : 0
  };
};

export default useReceipts;