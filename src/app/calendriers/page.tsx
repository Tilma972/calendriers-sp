// src/app/calendriers/page.tsx - Interface refactorisée avec clôture de tournée
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { useTourneeData } from '@/shared/hooks/useTourneeData';
import { supabase } from '@/shared/lib/supabase';
import ClotureModal from '@/components/ClotureModal';
import ExistingDonForm from '@/components/ExistingDonForm';


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
  
  const [showClotureForm, setShowClotureForm] = useState(false);
  const [showExistingDonForm, setShowExistingDonForm] = useState(false);
  const [submitInProgress, setSubmitInProgress] = useState(false);

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

        {/* Interface simplifiée en 3 sections claires */}
        {tourneeActive && (
          <div className="calendriers-interface space-y-6">
            
            {/* Section 1: Informations tournée en cours */}
            <section className="tournee-status">
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                    <span className="text-2xl">📊</span>
                    <span>Ma tournée en cours</span>
                  </h2>
                </div>
                
                {/* Stats compactes - 2 colonnes principales */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-red-600 mb-1">
                      {tourneeActive.total_amount}€
                    </div>
                    <div className="text-sm text-red-700 font-medium">Collecté</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {tourneeActive.calendars_distributed}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Distribués</div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${Math.min(100, (tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}%` 
                    }}
                  ></div>
                </div>
                
                <div className="text-center text-sm text-gray-600">
                  {Math.round((tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}% • {tourneeActive.total_transactions} don{tourneeActive.total_transactions > 1 ? 's' : ''}
                </div>
              </div>
            </section>

            {/* Section 2: PARCOURS A - Mode principal (80% des cas) */}
            <section className="mode-principal">
              <div className="card-principale bg-white rounded-2xl shadow-lg p-6 border-2 border-red-100">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
                    <span className="text-3xl">🏠</span>
                    <span>Clôturer ma tournée</span>
                  </h2>
                  <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                    Saisie des totaux de votre tournée
                  </p>
                  <button 
                    className="btn-primary-large w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-5 px-8 rounded-xl transition-colors text-xl flex items-center justify-center gap-3"
                    onClick={() => setShowClotureForm(true)}
                  >
                    <span className="text-2xl">✅</span>
                    <span>Clôturer maintenant</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Section 3: PARCOURS B - Mode exceptionnel (rare) */}
            <section className="mode-exceptionnel">
              <details className="mode-rare bg-gray-50 rounded-2xl border-2 border-gray-200">
                <summary className="p-5 cursor-pointer hover:bg-gray-100 rounded-2xl transition-colors list-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <div className="font-semibold text-gray-800 text-lg">Don individuel</div>
                        <div className="text-sm text-gray-600">Enregistrer un don spécifique avec ou sans reçu email</div>
                      </div>
                    </div>
                    <div className="text-gray-400 text-2xl">+</div>
                  </div>
                </summary>
                
                <div className="px-5 pb-5">
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setShowExistingDonForm(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3 text-lg"
                    >
                      <span className="text-xl">💰</span>
                      <span>Saisir un don unique</span>
                    </button>
                  </div>
                </div>
              </details>
            </section>

            {/* Modal Clôture de Tournée */}
            {showClotureForm && (
              <ClotureModal 
                tourneeActive={tourneeActive}
                onSuccess={() => {
                  setShowClotureForm(false);
                  refreshTourneeData(true);
                }}
                onClose={() => setShowClotureForm(false)}
              />
            )}

            {/* Modal Don Unique (Mode Exceptionnel) */}
            {showExistingDonForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40 overflow-y-auto">
                <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <ExistingDonForm 
                    tourneeActive={tourneeActive}
                    onSuccess={() => {
                      setShowExistingDonForm(false);
                      refreshTourneeData(true);
                    }}
                    onCancel={() => setShowExistingDonForm(false)}
                    updateTourneeOptimistic={updateTourneeOptimistic}
                    syncAfterOnlineSuccess={syncAfterOnlineSuccess}
                  />
                </div>
              </div>
            )}
          </div>  
        )}
      </main>
    </div>
  );
}