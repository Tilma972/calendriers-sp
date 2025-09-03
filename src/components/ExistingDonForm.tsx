// src/components/ExistingDonForm.tsx - Composant pour don unique (existant)
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import { supabase } from '@/shared/lib/supabase';
import { emailService } from '@/shared/services/emailService';

interface NewTransactionData {
  amount: number;
  calendars_given: number;
  payment_method: 'especes' | 'cheque' | 'carte';
  donator_name?: string;
  donator_email?: string;
  notes?: string;
}

interface ExistingDonFormProps {
  tourneeActive: any;
  onSuccess: () => void;
  onCancel: () => void;
  updateTourneeOptimistic: (data: { amount: number; calendars_given: number }) => void;
  syncAfterOnlineSuccess: () => void;
}

export default function ExistingDonForm({ 
  tourneeActive, 
  onSuccess, 
  onCancel,
  updateTourneeOptimistic,
  syncAfterOnlineSuccess
}: ExistingDonFormProps) {
  const { user, profile } = useAuthStore();
  const { isOnline, addPendingTransaction } = useOfflineStore();
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [needReceipt, setNeedReceipt] = useState(false);
  
  const [newDon, setNewDon] = useState<NewTransactionData>({
    amount: 10,
    calendars_given: 1,
    payment_method: 'especes',
    donator_name: '',
    donator_email: '',
    notes: '',
  });

  const handleSubmitDon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile?.team_id || !tourneeActive) return;

    setSubmitInProgress(true);

    try {
      if (isOnline) {
        // Mode online : enregistrer directement
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            team_id: profile.team_id,
            tournee_id: tourneeActive.tournee_id,
            amount: newDon.amount,
            calendars_given: newDon.calendars_given,
            payment_method: newDon.payment_method,
            donator_name: newDon.donator_name || null,
            donator_email: newDon.donator_email || null,
            notes: newDon.notes || null,
            status: 'pending'
          });

        if (error) {
          console.error('Erreur enregistrement don:', error);
          throw error;
        }

        // ✅ Mise à jour optimiste instantanée
        updateTourneeOptimistic({
          amount: newDon.amount,
          calendars_given: newDon.calendars_given
        });

        // ✅ Envoi automatique du reçu par email si demandé et email fourni
        if (data && data[0] && needReceipt && newDon.donator_email) {
          console.log('📧 Envoi reçu email en cours...', { transactionId: data[0].id, email: newDon.donator_email });
          
          // Envoi asynchrone pour ne pas bloquer l'UX
          emailService.processReceiptForTransaction(data[0].id).then(result => {
            if (result.success) {
              console.log('✅ Reçu envoyé par email:', result.receiptNumber);
              showSuccessToast(`Don enregistré ! Reçu envoyé à ${newDon.donator_email}`);
            } else {
              console.warn('⚠️ Erreur envoi reçu:', result.error);
              showSuccessToast('Don enregistré ! (Erreur envoi email)');
            }
          }).catch(err => {
            console.error('❌ Erreur process reçu:', err);
            showSuccessToast('Don enregistré ! (Erreur envoi email)');
          });
        } else {
          // ✅ Toast succès standard
          showSuccessToast('Don enregistré avec succès !');
        }

        // ✅ Synchronisation silencieuse en arrière-plan
        setTimeout(() => {
          syncAfterOnlineSuccess();
        }, 2000);

      } else {
        // Mode offline : mettre à jour directement
        throw new Error('Mode offline');
      }

    } catch (error) {
      // Enregistrement offline avec mise à jour immédiate
      console.log('💾 Enregistrement offline...');
      
      addPendingTransaction({
        user_id: user.id,
        team_id: profile.team_id,
        tournee_id: tourneeActive.tournee_id,
        amount: newDon.amount,
        calendars_given: newDon.calendars_given,
        payment_method: newDon.payment_method,
        donator_name: newDon.donator_name || undefined,
        donator_email: newDon.donator_email || undefined,
        notes: newDon.notes || undefined,
      });

      // ✅ Les stats se mettent à jour automatiquement via le hook
      showSuccessToast('Don sauvegardé hors-ligne !');
    }

    // Reset form et fermer
    resetForm();
    onSuccess();
    setSubmitInProgress(false);
  };

  const resetForm = () => {
    setNeedReceipt(false);
    setNewDon({
      amount: 10,
      calendars_given: 1,
      payment_method: 'especes',
      donator_name: '',
      donator_email: '',
      notes: '',
    });
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
          <span className="text-2xl">💰</span>
          <span>Nouveau don</span>
        </h3>
        {!isOnline && (
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            Mode offline
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmitDon} className="space-y-6">
        {/* Dans le modal de nouveau don, ajoutez ce choix au début */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <h4 className="font-semibold text-gray-800 mb-3">Type de don :</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNeedReceipt(false)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                !needReceipt ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm font-medium">Don simple</div>
            </button>
            
            <button
              type="button"
              onClick={() => setNeedReceipt(true)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                needReceipt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">📧</div>
              <div className="text-sm font-medium">Avec reçu email</div>
            </button>
          </div>
        </div>
        {/* Amount Input - Mobile Optimized */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Montant (€)
          </label>
          <input
            type="number"
            step="1"
            value={newDon.amount}
            onChange={(e) => setNewDon({ ...newDon, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500"
            required
          />
        </div>

        {/* Calendar Count - Mobile Optimized */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Nombre de calendriers
          </label>
          <select
            value={newDon.calendars_given}
            onChange={(e) => setNewDon({ ...newDon, calendars_given: parseInt(e.target.value) })}
            className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500"
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num} calendrier{num > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {/* Payment Method - Large Tap Targets */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Mode de paiement
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['especes', 'cheque', 'carte'] as const).map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setNewDon({ ...newDon, payment_method: method })}
                className={`py-4 px-4 rounded-xl text-base font-semibold transition-colors flex items-center justify-center gap-2 ${
                  newDon.payment_method === method
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">
                  {method === 'especes' && '💵'} 
                  {method === 'cheque' && '📝'} 
                  {method === 'carte' && '💳'}
                </span>
                <span>{method.charAt(0).toUpperCase() + method.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Puis conditionnellement afficher les champs email si needReceipt === true */}
        {needReceipt && (
          <>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Email du donateur *
              </label>
              <input
                type="email"
                value={newDon.donator_email}
                onChange={(e) => setNewDon({ ...newDon, donator_email: e.target.value })}
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@exemple.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Nom du donateur (optionnel)
              </label>
              <input
                type="text"
                value={newDon.donator_name}
                onChange={(e) => setNewDon({ ...newDon, donator_name: e.target.value })}
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                placeholder="Jean Dupont"
              />
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Notes (optionnel)
          </label>
          <textarea
            value={newDon.notes}
            onChange={(e) => setNewDon({ ...newDon, notes: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500 resize-none"
            rows={3}
            placeholder="Informations complémentaires..."
          />
        </div>

        {/* Offline Notice - Mobile Optimized */}
        {!isOnline && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="text-sm text-orange-800">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="text-lg">📱</span>
                <span>Mode hors-ligne</span>
              </div>
              <p>Ce don sera sauvegardé localement et synchronisé dès le retour du réseau.</p>
            </div>
          </div>
        )}

        {/* Action Buttons - Large Tap Targets */}
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
            <span>{isOnline ? 'Enregistrer' : 'Sauver offline'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}