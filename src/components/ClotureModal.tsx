// src/components/ClotureModal.tsx - Modal simplifié pour clôture de tournée
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import DonsDetailsList from './DonsDetailsList';

interface ClotureModalProps {
  tourneeActive: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClotureModal({ tourneeActive, onClose, onSuccess }: ClotureModalProps) {
  const { user, profile } = useAuthStore();
  const { isOnline, addPendingTransaction } = useOfflineStore();
  const [submitInProgress, setSubmitInProgress] = useState(false);
  
  const [formData, setFormData] = useState({
    totalEspeces: '',
    calendarsVendus: '',
    donsAvecRecus: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile?.team_id || !tourneeActive) return;

    // Validation basique
    if (!formData.totalEspeces || parseFloat(formData.totalEspeces) <= 0) {
      alert('⚠️ Veuillez saisir un montant en espèces');
      return;
    }

    if (!formData.calendarsVendus || parseInt(formData.calendarsVendus) <= 0) {
      alert('⚠️ Veuillez indiquer le nombre de calendriers vendus');
      return;
    }

    setSubmitInProgress(true);

    try {
      if (isOnline) {
        const response = await fetch('/api/tours/complete-tour', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournee_id: tourneeActive.tournee_id,
            user_id: user.id,
            team_id: profile.team_id,
            totalEspeces: parseFloat(formData.totalEspeces),
            calendarsVendus: parseInt(formData.calendarsVendus),
            donsDetailles: formData.donsAvecRecus
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de la clôture');
        }

        showSuccessToast('🎉 Tournée clôturée avec succès !');
        onSuccess();

      } else {
        // Mode offline - transaction principale
        addPendingTransaction({
          user_id: user.id,
          team_id: profile.team_id,
          tournee_id: tourneeActive.tournee_id,
          amount: parseFloat(formData.totalEspeces),
          calendars_given: parseInt(formData.calendarsVendus),
          payment_method: 'especes',
          donator_name: 'Clôture tournée - Espèces',
          notes: 'Clôture de tournée groupée'
        });

        // Dons détaillés avec reçus en mode offline
        formData.donsAvecRecus.forEach(don => {
          addPendingTransaction({
            user_id: user.id,
            team_id: profile.team_id,
            tournee_id: tourneeActive.tournee_id,
            amount: don.amount,
            calendars_given: don.calendars_given,
            payment_method: don.payment_method,
            donator_name: don.donator_name,
            donator_email: don.donator_email,
            notes: don.notes
          });
        });

        showSuccessToast('💾 Tournée sauvegardée hors-ligne !');
        onSuccess();
      }

    } catch (error) {
      console.error('Erreur clôture tournée:', error);
      alert('❌ Erreur lors de la clôture: ' + (error as Error).message);
    } finally {
      setSubmitInProgress(false);
    }
  };

  const updateDonsAvecRecus = (dons: any[]) => {
    setFormData({ ...formData, donsAvecRecus: dons });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">🏠</span>
            <span>Clôture de tournée</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section obligatoire - 30 secondes */}
          <div className="section-rapide bg-red-50 border-2 border-red-100 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span>Totaux (obligatoire)</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total espèces collectées (€) *
                </label>
                <input 
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={formData.totalEspeces}
                  onChange={(e) => setFormData({...formData, totalEspeces: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre de calendriers vendus *
                </label>
                <input 
                  type="number"
                  min="1"
                  placeholder="0"
                  value={formData.calendarsVendus}
                  onChange={(e) => setFormData({...formData, calendarsVendus: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section optionnelle */}
          <details className="section-optionnelle border-2 border-gray-200 rounded-xl mb-6">
            <summary className="p-4 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">💳</span>
              <span>+ Dons détaillés avec reçus (chèques/cartes)</span>
              <span className="ml-auto bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                {formData.donsAvecRecus.length}
              </span>
            </summary>
            
            <div className="p-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                📧 Ajoutez ici les dons par chèque ou carte bancaire pour lesquels vous souhaitez envoyer un reçu automatique par email.
              </p>
              <DonsDetailsList 
                dons={formData.donsAvecRecus}
                onUpdate={updateDonsAvecRecus}
              />
            </div>
          </details>

          {/* Récapitulatif */}
          {(formData.totalEspeces || formData.donsAvecRecus.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <span>📋</span>
                <span>Récapitulatif</span>
              </h4>
              
              <div className="space-y-2 text-sm text-blue-800">
                {formData.totalEspeces && (
                  <div className="flex justify-between">
                    <span>💵 Total espèces:</span>
                    <strong>{formData.totalEspeces}€</strong>
                  </div>
                )}
                
                {formData.calendarsVendus && (
                  <div className="flex justify-between">
                    <span>📅 Calendriers vendus:</span>
                    <strong>{formData.calendarsVendus}</strong>
                  </div>
                )}
                
                {formData.donsAvecRecus.length > 0 && (
                  <div className="flex justify-between">
                    <span>💳 Dons détaillés:</span>
                    <strong>
                      {formData.donsAvecRecus.length} don{formData.donsAvecRecus.length > 1 ? 's' : ''} 
                      ({formData.donsAvecRecus.reduce((sum, don) => sum + don.amount, 0)}€)
                    </strong>
                  </div>
                )}
                
                <div className="border-t border-blue-300 pt-2 mt-2">
                  <div className="flex justify-between text-base font-bold">
                    <span>🏆 Total général:</span>
                    <span>
                      {(parseFloat(formData.totalEspeces) || 0) + formData.donsAvecRecus.reduce((sum, don) => sum + don.amount, 0)}€
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Offline Notice */}
          {!isOnline && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
              <div className="text-sm text-orange-800">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <span className="text-lg">📱</span>
                  <span>Mode hors-ligne</span>
                </div>
                <p>La clôture sera sauvegardée localement et synchronisée dès le retour du réseau.</p>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="modal-actions flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={submitInProgress}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
            >
              {submitInProgress && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span className="text-xl">✅</span>
              <span>{isOnline ? 'Clôturer' : 'Sauver offline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}