// src/app/calendriers/page.tsx - Mobile-First Version
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
    console.log('🚀 handleStartTournee called!');
    console.log('User:', user);
    console.log('Profile:', profile);
    console.log('IsOnline:', isOnline);
    console.log('SubmitInProgress:', submitInProgress);
    
    if (!user || !profile?.team_id) {
      console.log('❌ Missing user or team_id, exiting early');
      console.log('User exists:', !!user);
      console.log('Profile exists:', !!profile);
      console.log('Team ID exists:', !!profile?.team_id);
      return;
    }

    if (!isOnline) {
      console.log('❌ Not online, showing alert');
      alert('⚠️ Vous devez être connecté pour démarrer une nouvelle tournée.');
      return;
    }

    console.log('✅ All checks passed, prompting for calendar count');
    const calendarsInitial = window.prompt('Nombre de calendriers initial :', '20');
    console.log('Calendar count input:', calendarsInitial);
    
    if (!calendarsInitial) {
      console.log('❌ No calendar count provided, exiting');
      return;
    }

    try {
      console.log('🔄 Setting submit in progress and calling supabase');
      setSubmitInProgress(true);

      const { data, error } = await supabase.rpc('start_new_tournee', {
        p_user_id: user.id,
        p_calendars_initial: parseInt(calendarsInitial)
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Erreur démarrage tournée:', error);
        alert('Erreur lors du démarrage de la tournée: ' + error.message);
        return;
      }

      // ✅ Mise à jour fluide sans reload !
      console.log('🔄 Refreshing tournee data');
      await refreshTourneeData(true);
      console.log('✅ Tournée started successfully');
      alert('🚀 Tournée démarrée avec succès !');

    } catch (error) {
      console.error('Erreur catch block:', error);
      alert('Erreur lors du démarrage de la tournée: ' + (error as Error).message);
    } finally {
      console.log('🔄 Resetting submit in progress');
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

      {/* Mobile-First Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Top row - back button and title */}
            <div className="flex items-center justify-between">
              <a 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 py-2 px-3 -mx-3 rounded-lg tap-target"
              >
                <span className="text-lg">←</span>
                <span className="text-base font-medium">Accueil</span>
              </a>
              
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="hidden sm:inline">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
            
            {/* Title row */}
            <div className="flex items-center gap-3">
              <div className="text-3xl">📅</div>
              <h1 className="text-2xl font-bold text-gray-900">Calendriers 2025</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-8">
        {/* No Active Tour - Mobile Optimized */}
        {!tourneeActive && (
          <div className="text-center py-8">
            <div className="text-8xl mb-8">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 px-2">
              Aucune tournée en cours
            </h2>
            <p className="text-gray-600 mb-8 text-base leading-relaxed px-2">
              Démarrez une nouvelle tournée pour commencer à enregistrer vos dons
            </p>
            <button
              onClick={handleStartTournee}
              disabled={submitInProgress || !isOnline}
              className="w-full max-w-sm mx-auto bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-3 text-lg tap-target"
            >
              {submitInProgress && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span className="text-xl">🚀</span>
              <span>Démarrer une tournée</span>
            </button>
            {!isOnline && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 mx-auto max-w-sm">
                <p className="text-sm text-orange-700 font-medium">
                  ⚠️ Connexion requise pour démarrer une tournée
                </p>
              </div>
            )}
          </div>
        )}

        {/* Active Tour - Mobile Optimized */}
        {tourneeActive && (
          <div className="space-y-6">
            {/* Stats Tour - Mobile-First Layout */}
            <div className="bg-white rounded-2xl shadow-lg p-5 transition-all duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <span className="text-2xl">📊</span>
                  <span>Ma tournée en cours</span>
                </h2>
              </div>
              
              {/* Mobile-First Grid - 2 columns on mobile, 4 on larger screens */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {tourneeActive.calendars_initial}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Initial</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 transition-all duration-500 mb-1">
                    {tourneeActive.calendars_distributed}
                  </div>
                  <div className="text-sm text-green-700 font-medium">Distribués</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600 transition-all duration-500 mb-1">
                    {Math.max(0, tourneeActive.calendars_remaining)}
                  </div>
                  <div className="text-sm text-orange-700 font-medium">Restants</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 transition-all duration-500 mb-1">
                    {tourneeActive.total_amount}€
                  </div>
                  <div className="text-sm text-red-700 font-medium">Collecté</div>
                </div>
              </div>

              {/* Progress Bar - Larger for mobile */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div 
                  className="bg-green-600 h-4 rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${Math.min(100, (tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}%` 
                  }}
                ></div>
              </div>

              <div className="text-center mb-6">
                <div className="text-lg font-semibold text-gray-800 mb-1">
                  {Math.round((tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}% de progression
                </div>
                <div className="text-sm text-gray-600">
                  {tourneeActive.total_transactions} don{tourneeActive.total_transactions > 1 ? 's' : ''} enregistré{tourneeActive.total_transactions > 1 ? 's' : ''}
                </div>
              </div>

              <button
                onClick={() => setShowNewDonForm(true)}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg flex items-center justify-center gap-3 tap-target"
              >
                <span className="text-xl">💰</span>
                <span>Enregistrer un nouveau don</span>
              </button>
            </div>

            {/* Mobile-First Form Modal */}
            {showNewDonForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-40">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      <span>Nouveau Don</span>
                    </h3>
                    {!isOnline && (
                      <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                        Mode offline
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={handleSubmitDon} className="space-y-6">
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
                        className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500 tap-target"
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
                        className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500 tap-target"
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
                            className={`py-4 px-4 rounded-xl text-base font-semibold transition-colors tap-target flex items-center justify-center gap-2 ${
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

                    {/* Donator Name - Mobile Optimized */}
                    <div>
                      <label className="block text-base font-semibold text-gray-800 mb-3">
                        Nom du donateur (optionnel)
                      </label>
                      <input
                        type="text"
                        value={newDon.donator_name}
                        onChange={(e) => setNewDon({ ...newDon, donator_name: e.target.value })}
                        className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500 tap-target"
                        placeholder="M. Dupont"
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
                        onClick={() => setShowNewDonForm(false)}
                        className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-colors text-lg tap-target"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={submitInProgress}
                        className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-3 text-lg tap-target"
                      >
                        {submitInProgress && (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <span>{isOnline ? 'Enregistrer' : 'Sauver offline'}</span>
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