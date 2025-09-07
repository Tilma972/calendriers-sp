// src/app/calendriers/page.tsx - Interface épurée et professionnelle
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { useTourneeData } from '@/shared/hooks/useTourneeData';
import { supabase } from '@/shared/lib/supabase';
import ClotureModal from '@/components/ClotureModal';
import ExistingDonForm from '@/components/ExistingDonForm';
import {
  ArrowLeft,
  Calendar,
  Wifi,
  WifiOff,
  Play,
  CheckCircle,
  Receipt,
  Home
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CalendriersPage() {
  const router = useRouter();
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

  // Démarrer nouvelle tournée - FONCTION PRÉSERVÉE
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
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />
      
      {/* Header épuré et professionnel */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Navigation et titre */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Retour à l'accueil"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    Calendriers 2025
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {profile?.full_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Statut connexion discret - responsive */}
            <div className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
              isOnline 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3 sm:w-4 sm:h-4" /> : <WifiOff className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        
        {/* État : Aucune tournée active - Mobile-First */}
        {!tourneeActive && (
          <div className="text-center py-8 sm:py-12 px-2">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Aucune tournée en cours
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-sm sm:max-w-md mx-auto px-2">
              Démarrez une nouvelle tournée pour commencer à collecter et gérer vos dons
            </p>

            <button
              onClick={handleStartTournee}
              disabled={submitInProgress || !isOnline}
              className="inline-flex items-center space-x-2 sm:space-x-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-colors text-sm sm:text-base w-full sm:w-auto max-w-xs"
            >
              {submitInProgress && (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Démarrer une tournée</span>
            </button>

            {!isOnline && (
              <div className="mt-4 sm:mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 max-w-sm sm:max-w-md mx-auto">
                <div className="flex items-center space-x-2 justify-center">
                  <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-amber-700 font-medium text-center">
                    Connexion requise pour démarrer une tournée
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* État : Tournée active */}
        {tourneeActive && (
          <div className="space-y-8">
            
            {/* Dashboard - Vue d'ensemble épurée - Mobile-First */}
            <section>
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Tournée en cours
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Vue d'ensemble de votre progression
                  </p>
                </div>

                <div className="p-4 sm:p-6">
                  {/* Métriques principales - Design clean mobile-first */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
                    <div className="text-center p-3 sm:p-0">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {tourneeActive.total_amount}€
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Collecté</div>
                    </div>

                    <div className="text-center p-3 sm:p-0">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {tourneeActive.calendars_distributed}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Distribués</div>
                    </div>

                    <div className="text-center p-3 sm:p-0">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {tourneeActive.total_transactions}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Dons</div>
                    </div>

                    <div className="text-center p-3 sm:p-0">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {Math.round((tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Progression</div>
                    </div>
                  </div>

                  {/* Barre de progression minimaliste - Mobile optimized */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
                      <span className="truncate">Calendriers distribués</span>
                      <span className="flex-shrink-0 ml-2">{tourneeActive.calendars_distributed} / {tourneeActive.calendars_initial}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-700"
                        style={{ 
                          width: `${Math.min(100, (tourneeActive.calendars_distributed / tourneeActive.calendars_initial) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Indicateur offline si nécessaire */}
                  {!isOnline && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <WifiOff className="w-4 h-4 text-amber-600" />
                        <p className="text-xs sm:text-sm text-amber-700 font-medium">
                          Mode hors ligne - Données synchronisées au retour du réseau
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Actions principales - Design équilibré mobile-first */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 px-1">
                Actions rapides
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Action 1 : Clôture de tournée */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      Clôturer la tournée
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 px-2 sm:px-0">
                      Enregistrez le nombre total de calendriers distribués et finalisez votre tournée.
                    </p>
                    <button
                      onClick={() => setShowClotureForm(true)}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                      disabled={!isOnline}
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Clôturer</span>
                    </button>
                    {!isOnline && (
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        Connexion requise
                      </p>
                    )}
                  </div>
                </div>

                {/* Action 2 : Don avec reçu */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      Don avec reçu
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 px-2 sm:px-0">
                      Enregistrement immédiat avec reçu email et paiement QR pour les donateurs.
                    </p>
                    <button
                      onClick={() => setShowExistingDonForm(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Nouveau don</span>
                    </button>
                    {!isOnline && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        Disponible hors ligne
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Modal Clôture de Tournée - FONCTION PRÉSERVÉE */}
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

        {/* Modal Don avec reçu - FONCTION PRÉSERVÉE - Mobile optimized */}
        {showExistingDonForm && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-2xl min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto">
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
      </main>
    </div>
  );
}