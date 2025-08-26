// src/app/calendriers/page.tsx - Version avec UX fluide
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { useTourneeData } from '@/shared/hooks/useTourneeData';
import { supabase } from '@/shared/lib/supabase';

interface NewTransactionData {
  amount: number;
  calendars_given: number;
  payment_method: 'especes' | 'cheque' | 'carte';
  donator_name?: string;
  donator_email?: string;
  notes?: string;
}

export default function CalendriersPage() {
  const { profile, user } = useAuthStore();
  const { isOnline, addPendingTransaction } = useOfflineStore();
  
  // Utilisation du hook personnalisé
  const {
    tourneeActive,
    isLoading,
    updateTourneeOptimistic,
    syncAfterOnlineSuccess,
    refreshTourneeData
  } = useTourneeData(user?.id);
  
  const [showNewDonForm, setShowNewDonForm] = useState(false);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  
  // Form state
  const [newDon, setNewDon] = useState<NewTransactionData>({
    amount: 10,
    calendars_given: 1,
    payment_method: 'especes',
    donator_name: '',
    donator_email: '',
    notes: '',
  });

  // Démarrer nouvelle tournée (avec refresh intelligent)
  const handleStartTournee = async () => {
    if (!user || !profile?.team_id) return;

    if (!isOnline) {
      alert('⚠️ Vous devez être connecté pour démarrer une nouvelle tournée.');
      return;
    }

    const calendarsInitial = window.prompt('Nombre de calendriers initial :', '20');
    if (!calendarsInitial) return;

    try {
      setSubmitInProgress(true);

      const { data, error } = await supabase.rpc('start_new_tournee', {
        p_user_id: user.id,
        p_calendars_initial: parseInt(calendarsInitial)
      });

      if (error) {
        console.error('Erreur démarrage tournée:', error);
        alert('Erreur lors du démarrage de la tournée');
        return;
      }

      // ✅ Mise à jour fluide sans reload !
      await refreshTourneeData(true);
      alert('🚀 Tournée démarrée avec succès !');

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du démarrage de la tournée');
    } finally {
      setSubmitInProgress(false);
    }
  };

  // Enregistrer nouveau don (UX optimiste + fluide)
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

        // ✅ Toast succès
        showSuccessToast('Don enregistré avec succès !');

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
    setShowNewDonForm(false);
    setSubmitInProgress(false);
  };

  // Fonctions utilitaires
  const resetForm = () => {
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
    // Toast personnalisé ou alert simple
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <a href="/" className="text-gray-500 hover:text-gray-700">
                ← Accueil
              </a>
              <div className="text-2xl">📅</div>
              <h1 className="text-xl font-bold text-gray-900">Calendriers 2025</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pas de tournée active */}
        {!tourneeActive && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Aucune tournée en cours
            </h2>
            <p className="text-gray-600 mb-8">
              Démarrez une nouvelle tournée pour commencer à enregistrer vos dons
            </p>
            <button
              onClick={handleStartTournee}
              disabled={submitInProgress || !isOnline}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {submitInProgress && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              🚀 Démarrer une tournée
            </button>
            {!isOnline && (
              <p className="text-sm text-orange-600 mt-2">
                ⚠️ Connexion requise pour démarrer une tournée
              </p>
            )}
          </div>
        )}

        {/* Tournée active */}
        {tourneeActive && (
          <div className="space-y-6">
            {/* Stats tournée - avec animations fluides */}
            <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  📊 Ma tournée en cours
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {tourneeActive.calendars_initial}
                  </div>
                  <div className="text-sm text-gray-600">Initial</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 transition-all duration-500">
                    {tourneeActive.calendars_distributed}
                  </div>
                  <div className="text-sm text-gray-600">Distribués</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 transition-all duration-500">
                    {Math.max(0, tourneeActive.calendars_remaining)}
                  </div>
                  <div className="text-sm text-gray-600">Restants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 transition-all duration-500">
                    {tourneeActive.total_amount}€
                  </div>
                  <div className="text-sm text-gray-600">Collecté</div>
                </div>
              </div>

              {/* Barre de progression animée */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${Math.min(100, (tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}%` 
                  }}
                ></div>
              </div>

              <div className="flex justify-between text-sm text-gray-600 mb-6">
                <span>Progression: {Math.round((tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}%</span>
                <span>{tourneeActive.total_transactions} dons enregistrés</span>
              </div>

              <button
                onClick={() => setShowNewDonForm(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                💰 Enregistrer un nouveau don
              </button>
            </div>

            {/* Formulaire modal (identique mais avec les nouveaux handlers) */}
            {showNewDonForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      💰 Nouveau Don
                    </h3>
                    {!isOnline && (
                      <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                        Mode offline
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={handleSubmitDon} className="space-y-4">
                    {/* Formulaire identique... */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newDon.amount}
                        onChange={(e) => setNewDon({ ...newDon, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de calendriers
                      </label>
                      <select
                        value={newDon.calendars_given}
                        onChange={(e) => setNewDon({ ...newDon, calendars_given: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num} calendrier{num > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de paiement
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['especes', 'cheque', 'carte'] as const).map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setNewDon({ ...newDon, payment_method: method })}
                            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                              newDon.payment_method === method
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {method === 'especes' && '💵'} 
                            {method === 'cheque' && '📝'} 
                            {method === 'carte' && '💳'} 
                            {' '}
                            {method.charAt(0).toUpperCase() + method.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom du donateur (optionnel)
                      </label>
                      <input
                        type="text"
                        value={newDon.donator_name}
                        onChange={(e) => setNewDon({ ...newDon, donator_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        placeholder="M. Dupont"
                      />
                    </div>

                    {!isOnline && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                        <div className="text-sm text-orange-800">
                          <strong>📱 Mode hors-ligne</strong>
                          <p className="mt-1">Ce don sera sauvegardé localement et synchronisé dès le retour du réseau.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowNewDonForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={submitInProgress}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitInProgress && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {isOnline ? 'Enregistrer' : 'Sauver offline'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}