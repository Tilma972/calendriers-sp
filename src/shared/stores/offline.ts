// src/shared/stores/offline.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/shared/lib/supabase';

// Types pour les données offline
interface OfflineTransaction {
  id: string; // UUID temporaire
  user_id: string;
  team_id: string | null;
  tournee_id: string | null;
  amount: number;
  calendars_given: number;
  payment_method: 'especes' | 'cheque' | 'carte' | 'virement';
  donator_name?: string;
  donator_email?: string;
  notes?: string;
  created_at: string;
  // Metadata offline
  offline_created: boolean;
  sync_attempts: number;
  last_sync_attempt?: string;
  sync_error?: string;
}

interface OfflineState {
  // État
  isOnline: boolean;
  pendingTransactions: OfflineTransaction[];
  syncInProgress: boolean;
  lastSyncAt?: string;
  
  // Statistiques
  totalPendingAmount: number;
  totalPendingCalendars: number;

  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  addPendingTransaction: (transaction: Omit<OfflineTransaction, 'id' | 'offline_created' | 'sync_attempts' | 'created_at'>) => void;
  syncPendingTransactions: () => Promise<void>;
  clearSyncedTransaction: (id: string) => void;
  incrementSyncAttempts: (id: string, error?: string) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // État initial
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingTransactions: [],
      syncInProgress: false,
      lastSyncAt: undefined,
      totalPendingAmount: 0,
      totalPendingCalendars: 0,

      // Mettre à jour le statut en ligne
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        
        // Si on repasse en ligne, essayer de synchroniser
        if (isOnline && get().pendingTransactions.length > 0) {
          setTimeout(() => {
            get().syncPendingTransactions();
          }, 1000); // Délai de 1s pour laisser la connexion s'établir
        }
      },

      // Ajouter une transaction en attente
      addPendingTransaction: (transactionData) => {
        const transaction: OfflineTransaction = {
          ...transactionData,
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          offline_created: true,
          sync_attempts: 0,
        };

        const currentPending = get().pendingTransactions;
        const updatedPending = [...currentPending, transaction];

        // Calculer les totaux
        const totalAmount = updatedPending.reduce((sum, t) => sum + t.amount, 0);
        const totalCalendars = updatedPending.reduce((sum, t) => sum + t.calendars_given, 0);

        set({
          pendingTransactions: updatedPending,
          totalPendingAmount: totalAmount,
          totalPendingCalendars: totalCalendars,
        });

        // Si on est en ligne, essayer de synchroniser immédiatement
        if (get().isOnline) {
          setTimeout(() => {
            get().syncPendingTransactions();
          }, 100);
        }
      },

      // Synchroniser les transactions en attente
      syncPendingTransactions: async () => {
        const { isOnline, pendingTransactions, syncInProgress } = get();
        
        if (!isOnline || syncInProgress || pendingTransactions.length === 0) {
          return;
        }

        set({ syncInProgress: true });

        console.log(`🔄 Début sync de ${pendingTransactions.length} transactions...`);

        for (const transaction of pendingTransactions) {
          try {
            // Essayer d'insérer en base
            const { data, error } = await supabase
              .from('transactions')
              .insert({
                user_id: transaction.user_id,
                team_id: transaction.team_id,
                tournee_id: transaction.tournee_id,
                amount: transaction.amount,
                calendars_given: transaction.calendars_given,
                payment_method: transaction.payment_method,
                donator_name: transaction.donator_name || null,
                donator_email: transaction.donator_email || null,
                notes: transaction.notes || null,
                status: 'pending'
              })
              .select()
              .single();

            if (error) {
              console.error(`❌ Erreur sync transaction ${transaction.id}:`, error);
              get().incrementSyncAttempts(transaction.id, error.message);
            } else {
              console.log(`✅ Transaction ${transaction.id} synchronisée avec succès`);
              get().clearSyncedTransaction(transaction.id);
            }

          } catch (error: unknown) {
            console.error(`💥 Erreur réseau sync ${transaction.id}:`, error);
            const message = error instanceof Error ? error.message : String(error);
            get().incrementSyncAttempts(transaction.id, message);
          }

          // Petit délai entre les syncs pour éviter de surcharger
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        set({ 
          syncInProgress: false,
          lastSyncAt: new Date().toISOString()
        });

        console.log(`🏁 Sync terminée`);
      },

      // Supprimer une transaction synchronisée avec succès
      clearSyncedTransaction: (id: string) => {
        const currentPending = get().pendingTransactions;
        const updatedPending = currentPending.filter(t => t.id !== id);

        // Recalculer les totaux
        const totalAmount = updatedPending.reduce((sum, t) => sum + t.amount, 0);
        const totalCalendars = updatedPending.reduce((sum, t) => sum + t.calendars_given, 0);

        set({
          pendingTransactions: updatedPending,
          totalPendingAmount: totalAmount,
          totalPendingCalendars: totalCalendars,
        });
      },

      // Incrémenter les tentatives de sync et logger l'erreur
      incrementSyncAttempts: (id: string, error?: string) => {
        const currentPending = get().pendingTransactions;
        const updatedPending = currentPending.map(transaction => {
          if (transaction.id === id) {
            return {
              ...transaction,
              sync_attempts: transaction.sync_attempts + 1,
              last_sync_attempt: new Date().toISOString(),
              sync_error: error || 'Unknown error',
            };
          }
          return transaction;
        });

        set({ pendingTransactions: updatedPending });
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        pendingTransactions: state.pendingTransactions,
        lastSyncAt: state.lastSyncAt,
        totalPendingAmount: state.totalPendingAmount,
        totalPendingCalendars: state.totalPendingCalendars,
      }),
    }
  )
);

// Hook pour initialiser la détection online/offline
export const useOfflineDetection = () => {
  const { setOnlineStatus } = useOfflineStore();

  // Initialiser la détection online/offline
  if (typeof window !== 'undefined') {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  return () => {};
};