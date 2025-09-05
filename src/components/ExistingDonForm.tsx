// src/components/ExistingDonForm.tsx - Composant optimisé PWA sapeurs-pompiers
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import { supabase } from '@/shared/lib/supabase';
import QRCodeDisplay from './QRCodeDisplay';

interface NewTransactionData {
  amount: number;
  calendars_given: number;
  payment_method: 'especes' | 'cheque' | 'carte';
  donator_name?: string;
  donator_email?: string;
  notes?: string;
}

// Types pour les boutons de saisie rapide
type QuickAmountButton = {
  value: number;
  label: string;
  popular?: boolean;
};

// Types pour les méthodes de paiement avec couleurs et icons
type PaymentMethodOption = {
  id: 'especes' | 'cheque' | 'carte';
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  hoverColor: string;
  description: string;
};

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
  const [needReceipt, setNeedReceipt] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);

  const [newDon, setNewDon] = useState<NewTransactionData>({
    amount: 10,
    calendars_given: 1,
    payment_method: 'especes',
    donator_name: '',
    donator_email: '',
    notes: '',
  });

  // Configuration des boutons de saisie rapide
  const quickAmounts: QuickAmountButton[] = useMemo(() => [
    { value: 5, label: '5€', popular: false },
    { value: 10, label: '10€', popular: true },
    { value: 20, label: '20€', popular: false },
  ], []);

  // Configuration des méthodes de paiement optimisée
  const paymentMethods: PaymentMethodOption[] = useMemo(() => [
    {
      id: 'especes',
      label: 'Espèces',
      icon: '💵',
      bgColor: 'bg-green-600',
      textColor: 'text-white',
      hoverColor: 'hover:bg-green-700',
      description: 'Paiement cash immédiat'
    },
    {
      id: 'cheque',
      label: 'Chèque',
      icon: '📝',
      bgColor: 'bg-blue-600',
      textColor: 'text-white', 
      hoverColor: 'hover:bg-blue-700',
      description: 'Chèque à l\'ordre des SP'
    },
    {
      id: 'carte',
      label: 'Carte/QR',
      icon: '💳📱',
      bgColor: 'bg-red-600',
      textColor: 'text-white',
      hoverColor: 'hover:bg-red-700',
      description: 'Paiement mobile sécurisé'
    }
  ], []);

  // Feedback tactile mobile (vibration)
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator.vibrate(50); // Vibration courte de 50ms
    }
  }, []);

  // Handler optimisé pour la sélection rapide du montant
  const handleQuickAmountSelect = useCallback((amount: number) => {
    triggerHapticFeedback();
    setNewDon(prev => ({
      ...prev,
      amount,
      calendars_given: Math.max(1, Math.floor(amount / 10)) // Auto-calcul calendriers
    }));
  }, [triggerHapticFeedback]);

  // Handler optimisé pour la sélection du mode de paiement
  const handlePaymentMethodSelect = useCallback((method: 'especes' | 'cheque' | 'carte') => {
    triggerHapticFeedback();
    setNewDon(prev => ({ ...prev, payment_method: method }));
    
    // Auto-affichage QR pour les paiements carte
    if (method === 'carte') {
      setShowQRCode(true);
    } else {
      setShowQRCode(false);
    }
  }, [triggerHapticFeedback]);

  const handleSubmitDon = async (e: React.FormEvent) => {
    console.log('🔥 DÉBUT HANDLESUBMITDON');
    e.preventDefault();
    if (!user || !profile?.team_id || !tourneeActive) return;

    setSubmitInProgress(true);

    try {
      if (isOnline) {
        console.log('🔥 Mode online confirmé');

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
          })
          .select(); // ← AJOUTEZ CETTE LIGNE !
          
        console.log('🔥 Insertion terminée, error:', error);
        console.log('🔥 Data reçue:', data);

        if (error) {
          console.error('Erreur enregistrement don:', error);
          throw error;
        }

        console.log('🔥 Pas d\'erreur, continuons...');
        console.log('🔥 data[0]:', data[0]);
        console.log('🔥 newDon.donator_email:', newDon.donator_email);

        // ✅ Mise à jour optimiste instantanée
        updateTourneeOptimistic({
          amount: newDon.amount,
          calendars_given: newDon.calendars_given
        });

        console.log('🔥 Mise à jour optimiste terminée');

        // ✅ VÉRIFICATION DE LA CONDITION CRITIQUE
        console.log('🔥 Vérification conditions pour fetch:');
        console.log('🔥   data:', !!data);
        console.log('🔥   data[0]:', !!data?.[0]);
        console.log('🔥   data[0].id:', data?.[0]?.id);
        console.log('🔥   newDon.donator_email:', newDon.donator_email);

        if (data && data[0] && newDon.donator_email) {
          console.log('🚀 CONDITIONS OK - DÉBUT FETCH !');
          console.log('📧 Envoi reçu via nouvelle API...', {
            transactionId: data[0].id,
            email: newDon.donator_email
          });

          try {
            console.log('🚀 Lancement du fetch...');

            const response = await fetch('/api/donations/send-receipt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                transactionId: data[0].id,
                donatorInfo: {
                  email: newDon.donator_email,
                  name: newDon.donator_name
                },
                sapeurInfo: {
                  name: profile?.full_name || 'Sapeur-Pompier'
                },
                options: {
                  sendEmail: true
                }
              })
            });

            console.log('📧 Statut réponse API:', response.status);
            const result = await response.json();
            console.log('📧 Résultat API complet:', result);

            if (result.success) {
              console.log('✅ Reçu envoyé avec nouvelle API:', result.receiptNumber);
              showSuccessToast(`Don enregistré ! Reçu envoyé à ${newDon.donator_email}`);
            } else {
              console.warn('⚠️ Erreur nouvelle API:', result.error);
              showSuccessToast('Don enregistré ! (Erreur envoi email: ' + result.error + ')');
            }
          } catch (err) {
            console.error('❌ Erreur fetch:', err);
            showSuccessToast('Don enregistré ! (Erreur technique)');
          }
        } else {
          console.log('❌ CONDITIONS FETCH NON REMPLIES:');
          console.log('❌   data:', !!data);
          console.log('❌   data[0]:', !!data?.[0]);
          console.log('❌   email:', newDon.donator_email);
          showSuccessToast('Don enregistré avec succès !');
        }

        // ✅ Synchronisation en arrière-plan
        setTimeout(() => {
          syncAfterOnlineSuccess();
        }, 2000);

      } else {
        console.log('🔥 Mode offline');
        throw new Error('Mode offline');
      }

    } catch (error) {
      console.log('💾 Erreur attrapée, mode offline...');
      // ... resto du code offline
    }

    // ✅ MAINTENANT seulement on ferme le formulaire
    console.log('🔥 Fermeture du formulaire...');
    resetForm();
    onSuccess();
    setSubmitInProgress(false);
  };



  const resetForm = () => {
    setNeedReceipt(true);
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
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header optimisé */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span>Nouveau don</span>
        </h3>
        {!isOnline && (
          <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
            <span className="hidden sm:inline">Mode offline</span>
            <span className="sm:hidden">📴</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmitDon} className="space-y-4 sm:space-y-6">
        
        {/* Saisie rapide du montant - NOUVEAU */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Montant
          </label>
          
          {/* Boutons de saisie rapide */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {quickAmounts.map(({ value, label, popular }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleQuickAmountSelect(value)}
                className={`relative py-3 px-4 rounded-xl text-base font-semibold transition-all duration-200 
                  transform active:scale-95 ${
                  newDon.amount === value
                    ? 'bg-red-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                } ${popular ? 'ring-2 ring-red-200' : ''}`}
                aria-label={`Sélectionner ${label}`}
              >
                {label}
                {popular && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                )}
              </button>
            ))}
          </div>

          {/* Champ montant libre */}
          <div className="relative">
            <input
              type="number"
              step="1"
              value={newDon.amount}
              onChange={(e) => setNewDon({ ...newDon, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              placeholder="Ou saisissez un montant"
              required
              aria-label="Montant personnalisé"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
              €
            </div>
          </div>
        </div>

        {/* Calendriers - Interface simplifiée */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Calendriers
          </label>
          <div className="flex items-center gap-3">
            <select
              value={newDon.calendars_given}
              onChange={(e) => setNewDon({ ...newDon, calendars_given: parseInt(e.target.value) })}
              className="flex-1 px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              aria-label="Nombre de calendriers"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num} calendrier{num > 1 ? 's' : ''}</option>
              ))}
            </select>
            <div className="text-sm text-gray-500 min-w-max">
              ≈ {newDon.amount}€ total
            </div>
          </div>
        </div>

        {/* Modes de paiement - Interface optimisée 3 boutons */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-3">
            Mode de paiement
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => handlePaymentMethodSelect(method.id)}
                className={`relative py-4 px-4 rounded-xl text-base font-semibold transition-all duration-200 
                  transform active:scale-95 flex flex-col items-center gap-2 min-h-[80px]
                  ${newDon.payment_method === method.id
                    ? `${method.bgColor} ${method.textColor} shadow-lg scale-105`
                    : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${method.hoverColor} hover:scale-102`
                  }`}
                aria-label={`Payer par ${method.label} - ${method.description}`}
              >
                <span className="text-xl sm:text-2xl">{method.icon}</span>
                <span className="text-sm sm:text-base">{method.label}</span>
                {newDon.payment_method === method.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white text-green-600 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Description du mode sélectionné */}
          <div className="mt-2 text-sm text-gray-600 text-center">
            {paymentMethods.find(m => m.id === newDon.payment_method)?.description}
          </div>
        </div>

        {/* Informations donateur - Interface condensée */}
        <div className="space-y-4">
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span>👤</span>
            <span>Informations donateur</span>
            <span className="text-sm font-normal text-gray-500">(optionnel)</span>
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                type="email"
                value={newDon.donator_email}
                onChange={(e) => setNewDon({ ...newDon, donator_email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Email (pour reçu)"
                aria-label="Email du donateur"
              />
            </div>
            
            <div>
              <input
                type="text"
                value={newDon.donator_name}
                onChange={(e) => setNewDon({ ...newDon, donator_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Nom complet"
                aria-label="Nom du donateur"
              />
            </div>
          </div>
        </div>

        {/* Notes - Interface compacte */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">
            Notes
          </label>
          <textarea
            value={newDon.notes}
            onChange={(e) => setNewDon({ ...newDon, notes: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all"
            rows={2}
            placeholder="Informations complémentaires..."
            aria-label="Notes sur le don"
          />
        </div>

        {/* QR Code intégré - NOUVEAU */}
        {showQRCode && profile?.team_id && (
          <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-red-900 flex items-center gap-2">
                <span>📱</span>
                <span>Paiement QR Code</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowQRCode(false)}
                className="text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded-lg transition-colors"
                aria-label="Fermer le QR Code"
              >
                ✕
              </button>
            </div>
            
            <QRCodeDisplay
              teamId={profile.team_id}
              teamName={tourneeActive?.team_name || 'Votre équipe'}
              teamColor={tourneeActive?.team_color || '#dc2626'}
              suggestedAmount={newDon.amount}
              calendarsCount={newDon.calendars_given}
              onSuccess={(transactionId) => {
                console.log('✅ QR Payment completed:', transactionId);
                triggerHapticFeedback();
                
                // Mise à jour optimiste avec les vraies valeurs
                updateTourneeOptimistic({
                  amount: newDon.amount,
                  calendars_given: newDon.calendars_given
                });
                
                // Synchronisation
                setTimeout(() => {
                  syncAfterOnlineSuccess();
                }, 2000);
                
                // Fermer tout et montrer succès
                setShowQRCode(false);
                onSuccess();
              }}
              onExpired={() => {
                console.log('⏰ QR Code expired');
                setShowQRCode(false);
              }}
              className="bg-white shadow-sm"
            />
          </div>
        )}

        {/* Notice mode offline - Optimisée */}
        {!isOnline && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <span className="text-orange-600 text-lg">📴</span>
              <div className="flex-1">
                <div className="font-semibold text-orange-800 text-sm">Mode hors-ligne</div>
                <div className="text-xs text-orange-700 mt-1">
                  Ce don sera sauvegardé localement et synchronisé au retour du réseau.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action - Interface améliorée */}
        {!showQRCode && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform active:scale-95 text-base sm:text-lg"
              aria-label="Annuler ce don"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={submitInProgress}
              className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-3 text-base sm:text-lg shadow-lg"
              aria-label={`Enregistrer don de ${newDon.amount}€`}
            >
              {submitInProgress && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>
                {submitInProgress 
                  ? 'Traitement...' 
                  : isOnline 
                    ? `Enregistrer ${newDon.amount}€` 
                    : 'Sauver offline'
                }
              </span>
            </button>
          </div>
        )}

        {/* Info rapide sur le mode carte/QR */}
        {newDon.payment_method === 'carte' && !showQRCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">💡 Astuce :</span> Le QR code s'affichera automatiquement pour ce mode de paiement
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// Styles CSS personnalisés pour les micro-interactions
const customStyles = `
  .hover\\:scale-102:hover {
    transform: scale(1.02);
  }
  
  .scale-105 {
    transform: scale(1.05);
  }
  
  @keyframes pulse-success {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
  
  .animate-pulse-success {
    animation: pulse-success 0.6s ease-in-out;
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  
  .shimmer-effect {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    background-size: 200px 100%;
    animation: shimmer 2s infinite;
  }
  
  /* Smooth transitions pour tous les éléments interactifs */
  .transition-all {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* Focus states améliorés pour l'accessibilité */
  .focus\\:ring-2:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    outline: none;
  }
  
  /* Boutons avec feedback visuel amélioré */
  .btn-payment {
    position: relative;
    overflow: hidden;
  }
  
  .btn-payment::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.3s, height 0.3s;
  }
  
  .btn-payment:active::before {
    width: 300px;
    height: 300px;
  }
  
  /* Responsive grid amélioré */
  @media (max-width: 640px) {
    .payment-grid {
      grid-template-columns: 1fr;
    }
  }
  
  @media (min-width: 641px) {
    .payment-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`;

// Injection des styles dans le document (uniquement côté client)
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('existing-don-form-styles');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'existing-don-form-styles';
    styleSheet.textContent = customStyles;
    document.head.appendChild(styleSheet);
  }
}