// src/shared/hooks/useTourneeData.ts - Hook personnalisé pour gestion fluide
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useOfflineStore } from '@/shared/stores/offline';

interface TourneeActive {
  tournee_id: string;
  calendars_initial: number;
  calendars_distributed: number;
  calendars_remaining: number;
  total_amount: number;
  total_transactions: number;
  started_at: string;
}

export function useTourneeData(userId: string | undefined) {
  const [tourneeActive, setTourneeActive] = useState<TourneeActive | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    totalPendingAmount, 
    totalPendingCalendars, 
    pendingTransactions,
    isOnline 
  } = useOfflineStore();

  // Fonction pour recharger les données
  const refreshTourneeData = useCallback(async (showLoading = false) => {
    if (!userId) return;

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('v_sapeur_dashboard')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'en_cours')
        .single();

      if (supabaseError && supabaseError.code !== 'PGRST116') {
        throw supabaseError;
      }

      if (data) {
        setTourneeActive({
          tournee_id: data.tournee_id ?? '',
          calendars_initial: data.calendars_initial ?? 0,
          calendars_distributed: data.calendars_distributed ?? 0,
          calendars_remaining: data.calendars_remaining ?? 0,
          total_amount: data.total_amount ?? 0,
          total_transactions: data.total_transactions ?? 0,
          started_at: data.started_at ?? '',
        });
      } else {
        setTourneeActive(null);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Erreur chargement tournée:', message);
      setError(message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [userId]);

  // Chargement initial
  useEffect(() => {
    refreshTourneeData(true);
  }, [refreshTourneeData]);

  // Mise à jour optimiste locale (sans attendre le serveur)
  const updateTourneeOptimistic = useCallback((newTransaction: {
    amount: number;
    calendars_given: number;
  }) => {
    if (!tourneeActive) return;

    setTourneeActive(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        total_amount: prev.total_amount + newTransaction.amount,
        total_transactions: prev.total_transactions + 1,
        calendars_distributed: prev.calendars_distributed + newTransaction.calendars_given,
        calendars_remaining: Math.max(0, prev.calendars_remaining - newTransaction.calendars_given),
      };
    });
  }, [tourneeActive]);

  // Calculer les stats avec les données offline incluses
  const tourneeWithOfflineStats = tourneeActive ? {
    ...tourneeActive,
    total_amount: tourneeActive.total_amount + totalPendingAmount,
    total_transactions: tourneeActive.total_transactions + pendingTransactions.length,
    calendars_distributed: tourneeActive.calendars_distributed + totalPendingCalendars,
    calendars_remaining: Math.max(0, tourneeActive.calendars_remaining - totalPendingCalendars),
  } : null;

  // Fonction pour synchroniser après succès online
  const syncAfterOnlineSuccess = useCallback(async () => {
    // Attendre un peu pour laisser le trigger mettre à jour
    await new Promise(resolve => setTimeout(resolve, 1000));
    await refreshTourneeData(false); // Pas de loading, mise à jour silencieuse
  }, [refreshTourneeData]);

  return {
    tourneeActive: tourneeWithOfflineStats,
    isLoading,
    error,
    refreshTourneeData,
    updateTourneeOptimistic,
    syncAfterOnlineSuccess,
  };
}