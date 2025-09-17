// src/components/TourneeClotureForm.tsx - Composant de clôture de tournée
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';

interface ClotureData {
  totalEspeces: number;
  calendarsVendus: number;
}

interface Tournee {
  tournee_id: string;
  team_id?: string;
  team_name?: string;
  team_color?: string;
}

interface TourneeClotureFormProps {
  tourneeActive?: Tournee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TourneeClotureForm({ 
  tourneeActive, 
  onSuccess, 
  onCancel 
}: TourneeClotureFormProps) {
  const { user, profile } = useAuthStore();
  const { isOnline, addPendingTransaction } = useOfflineStore();
  const [submitInProgress, setSubmitInProgress] = useState(false);
  
  const [clotureData, setClotureData] = useState<ClotureData>({
    totalEspeces: 0,
    calendarsVendus: 0
  });

  const handleSubmitCloture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile?.team_id || !tourneeActive) return;

    // Validation basique
    if (clotureData.totalEspeces <= 0) {
      alert('⚠️ Veuillez saisir un montant en espèces');
      return;
    }

    if (clotureData.calendarsVendus <= 0) {
      alert('⚠️ Veuillez indiquer le nombre de calendriers vendus');
      return;
    }

    setSubmitInProgress(true);

    try {
      if (isOnline) {
        // Appeler l'API de clôture de tournée
        const response = await fetch('/api/tours/complete-tour', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournee_id: tourneeActive.tournee_id,
            user_id: user.id,
            team_id: profile.team_id,
            totalEspeces: clotureData.totalEspeces,
            calendarsVendus: clotureData.calendarsVendus
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de la clôture');
        }

        showSuccessToast('🎉 Tournée clôturée avec succès !');
        onSuccess();

      } else {
        // Mode offline - enregistrer la transaction globale
        addPendingTransaction({
          user_id: user.id,
          team_id: profile.team_id,
          tournee_id: tourneeActive.tournee_id,
          amount: clotureData.totalEspeces,
          calendars_given: clotureData.calendarsVendus,
          payment_method: 'especes',
          donator_name: 'Clôture tournée - Espèces',
          notes: 'Clôture de tournée groupée'
        });

        showSuccessToast('💾 Tournée sauvegardée hors-ligne !');
        onSuccess();
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur clôture tournée:', message);
      alert('❌ Erreur lors de la clôture: ' + message);
    } finally {
      setSubmitInProgress(false);
    }
  };


  const showSuccessToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span>Clôturer ma tournée</span>
        </h3>
        {!isOnline && (
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            Mode offline
          </div>
        )}
      </div>

      <form onSubmit={handleSubmitCloture} className="space-y-6">
        {/* Section synthèse obligatoire */}
        <div className="bg-red-50 border-2 border-red-100 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span>Bilan rapide (obligatoire)</span>
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Total espèces collectées (€)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={clotureData.totalEspeces || ''}
                onChange={(e) => setClotureData({ 
                  ...clotureData, 
                  totalEspeces: parseFloat(e.target.value) || 0 
                })}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                placeholder="0"
              />
              <p className="text-sm text-gray-600 mt-1">
                💵 Somme totale des dons en espèces
              </p>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Calendriers vendus
              </label>
              <input
                type="number"
                min="1"
                value={clotureData.calendarsVendus || ''}
                onChange={(e) => setClotureData({ 
                  ...clotureData, 
                  calendarsVendus: parseInt(e.target.value) || 0 
                })}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                placeholder="0"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                📅 Nombre total distribué
              </p>
            </div>
          </div>
        </div>


        {/* Récapitulatif */}
        {clotureData.totalEspeces > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <span>📋</span>
              <span>Récapitulatif</span>
            </h5>
            
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>💵 Total espèces:</span>
                <strong>{clotureData.totalEspeces}€</strong>
              </div>
              
              <div className="flex justify-between">
                <span>📅 Calendriers vendus:</span>
                <strong>{clotureData.calendarsVendus}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="text-sm text-orange-800">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="text-lg">📱</span>
                <span>Mode hors-ligne</span>
              </div>
              <p>La clôture sera sauvegardée localement et synchronisée dès le retour du réseau.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitInProgress}
            className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
          >
            {submitInProgress && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span className="text-xl">✅</span>
            <span>{isOnline ? 'Clôturer la tournée' : 'Sauver offline'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}