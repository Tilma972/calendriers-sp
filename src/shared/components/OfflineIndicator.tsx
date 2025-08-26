// src/shared/components/OfflineIndicator.tsx
'use client';

import { useEffect } from 'react';
import { useOfflineStore, useOfflineDetection } from '@/shared/stores/offline';

export function OfflineIndicator() {
  const { 
    isOnline, 
    pendingTransactions, 
    syncInProgress, 
    totalPendingAmount,
    totalPendingCalendars,
    lastSyncAt,
    syncPendingTransactions 
  } = useOfflineStore();

  // Initialiser la détection online/offline
  useOfflineDetection();

  // Synchronisation périodique quand en ligne
  useEffect(() => {
    if (!isOnline || pendingTransactions.length === 0) return;

    const interval = setInterval(() => {
      if (!syncInProgress) {
        syncPendingTransactions();
      }
    }, 30000); // Essayer toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isOnline, pendingTransactions.length, syncInProgress, syncPendingTransactions]);

  // Si tout va bien, ne rien afficher
  if (isOnline && pendingTransactions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Indicateur hors-ligne */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Mode hors-ligne</span>
        </div>
      )}

      {/* Transactions en attente */}
      {pendingTransactions.length > 0 && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {syncInProgress ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              )}
              <span className="text-sm font-medium">
                {syncInProgress ? 'Synchronisation...' : `${pendingTransactions.length} don(s) en attente`}
              </span>
            </div>
            
            {!syncInProgress && isOnline && (
              <button
                onClick={() => syncPendingTransactions()}
                className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
              >
                Sync
              </button>
            )}
          </div>

          {/* Détails des dons en attente */}
          <div className="text-xs text-blue-100">
            <div>{totalPendingAmount}€ • {totalPendingCalendars} calendriers</div>
            {lastSyncAt && (
              <div className="mt-1">
                Dernière sync : {new Date(lastSyncAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Liste des transactions (si peu nombreuses) */}
          {pendingTransactions.length <= 3 && (
            <div className="mt-2 space-y-1">
              {pendingTransactions.map((transaction) => (
                <div key={transaction.id} className="text-xs bg-white bg-opacity-10 rounded px-2 py-1">
                  <div className="flex justify-between">
                    <span>{transaction.amount}€ • {transaction.calendars_given} cal.</span>
                    <span className="text-blue-200">
                      {transaction.payment_method === 'especes' && '💵'}
                      {transaction.payment_method === 'cheque' && '📝'}
                      {transaction.payment_method === 'carte' && '💳'}
                    </span>
                  </div>
                  {transaction.sync_attempts > 0 && (
                    <div className="text-red-200 text-xs mt-1">
                      Tentatives : {transaction.sync_attempts}
                      {transaction.sync_error && (
                        <div className="truncate">{transaction.sync_error}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message d'encouragement */}
          {!isOnline && (
            <div className="mt-2 text-xs text-blue-200">
              Vos données sont sauvées et se synchroniseront au retour du réseau
            </div>
          )}
        </div>
      )}
    </div>
  );
}