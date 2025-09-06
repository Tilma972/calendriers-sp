// src/components/ExistingDonForm.tsx - Composant optimisé PWA sapeurs-pompiers
'use client';

import { useState, useCallback, useMemo } from 'react';
import { CreditCard, Banknote, Receipt, User, MessageSquare, X, Check } from 'lucide-react';
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
  recommended?: boolean;
};

// Types pour les méthodes de paiement avec design professionnel
type PaymentMethodOption = {
  id: 'especes' | 'cheque' | 'carte';
  label: string;
  icon: any;
  description: string;
  accentColor: string;
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
  const [showQRCode, setShowQRCode] = useState(false);

  const [newDon, setNewDon] = useState<NewTransactionData>({
    amount: 10,
    calendars_given: 1,
    payment_method: 'especes',
    donator_name: '',
    donator_email: '',
    notes: '',
  });

  // Configuration professionnelle des montants
  const quickAmounts: QuickAmountButton[] = useMemo(() => [
    { value: 5, label: '5€' },
    { value: 10, label: '10€', recommended: true },
    { value: 15, label: '15€' },
    { value: 20, label: '20€' },
  ], []);

  // Configuration des modes de paiement - Design sobre
  const paymentMethods: PaymentMethodOption[] = useMemo(() => [
    {
      id: 'especes',
      label: 'Espèces',
      icon: Banknote,
      description: 'Paiement cash immédiat',
      accentColor: 'emerald'
    },
    {
      id: 'cheque',
      label: 'Chèque',
      icon: Receipt,
      description: 'À l\'ordre des Sapeurs-Pompiers',
      accentColor: 'blue'
    },
    {
      id: 'carte',
      label: 'Carte bancaire',
      icon: CreditCard,
      description: 'Paiement sécurisé par QR',
      accentColor: 'red'
    }
  ], []);

  // Feedback tactile mobile (vibration)
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator.vibrate(50); // Vibration courte de 50ms
    }
  }, []);

  // Handler optimisé pour la sélection rapide du montant (SANS calcul automatique calendriers)
  const handleQuickAmountSelect = useCallback((amount: number) => {
    triggerHapticFeedback();
    setNewDon(prev => ({
      ...prev,
      amount
      // Pas de calcul automatique des calendriers - on garde la valeur existante
    }));
  }, [triggerHapticFeedback]);

  // Handler optimisé pour la sélection du mode de paiement
  const handlePaymentMethodSelect = useCallback((method: 'especes' | 'cheque' | 'carte') => {
    triggerHapticFeedback();
    setNewDon(prev => ({ ...prev, payment_method: method }));
    setShowQRCode(method === 'carte');
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
          .select();
          
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
      // Mode offline : sauvegarder localement
      const offlineTransaction = {
        id: `offline_${Date.now()}`,
        user_id: user.id,
        team_id: profile?.team_id,
        tournee_id: tourneeActive.tournee_id,
        amount: newDon.amount,
        calendars_given: newDon.calendars_given,
        payment_method: newDon.payment_method,
        donator_name: newDon.donator_name || undefined,
        donator_email: newDon.donator_email || undefined,
        notes: newDon.notes || undefined,
        status: 'pending',
        created_at: new Date().toISOString(),
        offline: true
      };

      addPendingTransaction(offlineTransaction);
      
      // Mise à jour optimiste même en offline
      updateTourneeOptimistic({
        amount: newDon.amount,
        calendars_given: newDon.calendars_given
      });

      showSuccessToast('Don sauvegardé hors-ligne ! Sera synchronisé au retour du réseau.');
    }

    // ✅ MAINTENANT seulement on ferme le formulaire
    console.log('🔥 Fermeture du formulaire...');
    resetForm();
    onSuccess();
    setSubmitInProgress(false);
  };

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
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const getAccentClasses = (color: string, isSelected: boolean) => {
    const colors = {
      emerald: isSelected 
        ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
        : 'border-gray-200 hover:border-emerald-300 bg-white text-gray-700',
      blue: isSelected 
        ? 'border-blue-500 bg-blue-50 text-blue-900' 
        : 'border-gray-200 hover:border-blue-300 bg-white text-gray-700',
      red: isSelected 
        ? 'border-red-500 bg-red-50 text-red-900' 
        : 'border-gray-200 hover:border-red-300 bg-white text-gray-700'
    };
    return colors[color as keyof typeof colors] || colors.emerald;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border-4 border-red-500 min-h-screen">
      {/* Header épuré */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold text-gray-900">
            Nouveau don
          </h2>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              Hors ligne
            </div>
          )}
        </div>
        <p className="text-gray-600 text-sm">
          Enregistrement d'un don pour la campagne calendriers 2025
        </p>
      </div>

      <form onSubmit={handleSubmitDon} className="space-y-8">
        
        {/* Section Montant - Design professionnel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">1</span>
            </div>
            <label className="text-lg font-medium text-gray-900">
              Montant du don
            </label>
          </div>
          
          {/* Boutons montants - Style sobre */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {quickAmounts.map(({ value, label, recommended }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleQuickAmountSelect(value)}
                className={`relative p-4 border-2 rounded-xl font-medium transition-all duration-200 ${
                  newDon.amount === value
                    ? 'border-red-500 bg-red-500 text-white shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:shadow-md'
                }`}
              >
                {label}
                {recommended && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                )}
                {newDon.amount === value && (
                  <Check className="absolute -top-2 -right-2 w-5 h-5 text-red-600 bg-white rounded-full p-1" />
                )}
              </button>
            ))}
          </div>

          {/* Saisie libre - Design épuré */}
          <div className="relative">
            <input
              type="number"
              step="1"
              value={newDon.amount}
              onChange={(e) => setNewDon(prev => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors bg-white"
              placeholder="Montant personnalisé"
              required
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              €
            </div>
          </div>
        </div>

        {/* Section Calendriers - Contrôle manuel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">2</span>
            </div>
            <label className="text-lg font-medium text-gray-900">
              Nombre de calendriers
            </label>
          </div>

          <select
            value={newDon.calendars_given}
            onChange={(e) => setNewDon(prev => ({ ...prev, calendars_given: parseInt(e.target.value) }))}
            className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors bg-white"
            aria-label="Nombre de calendriers"
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num} calendrier{num > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {/* Section Mode de paiement */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">3</span>
            </div>
            <label className="text-lg font-medium text-gray-900">
              Mode de paiement
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = newDon.payment_method === method.id;
              
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handlePaymentMethodSelect(method.id)}
                  className={`p-4 border-2 rounded-xl transition-all duration-200 text-left ${
                    getAccentClasses(method.accentColor, isSelected)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mb-1">{method.label}</div>
                      <div className="text-sm opacity-75">{method.description}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* QR Code Section - Intégrée */}
        {showQRCode && profile?.team_id && (
          <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Paiement par carte
              </h3>
              <button
                type="button"
                onClick={() => setShowQRCode(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <QRCodeDisplay
              teamId={profile.team_id}
              teamName={tourneeActive?.team_name || 'Votre équipe'}
              teamColor={tourneeActive?.team_color || '#dc2626'}
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
              className="bg-white shadow-sm rounded-lg p-8 text-center"
            />
          </div>
        )}

        {/* Section Informations donateur - Optionnelle */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">4</span>
            </div>
            <label className="text-lg font-medium text-gray-900">
              Informations donateur
            </label>
            <span className="text-sm text-gray-500">(optionnel)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={newDon.donator_email}
                onChange={(e) => setNewDon(prev => ({ 
                  ...prev, 
                  donator_email: e.target.value 
                }))}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
                placeholder="email@exemple.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nom complet</label>
              <input
                type="text"
                value={newDon.donator_name}
                onChange={(e) => setNewDon(prev => ({ 
                  ...prev, 
                  donator_name: e.target.value 
                }))}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
                placeholder="Prénom Nom"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <label className="text-lg font-medium text-gray-900">
              Notes
            </label>
            <span className="text-sm text-gray-500">(optionnel)</span>
          </div>

          <textarea
            value={newDon.notes}
            onChange={(e) => setNewDon(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors resize-none"
            rows={3}
            placeholder="Informations complémentaires..."
          />
        </div>

        {/* Notice offline - Discrète */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-amber-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <div className="font-medium text-amber-800 text-sm">Mode hors ligne</div>
                <div className="text-amber-700 text-xs mt-1">
                  Ce don sera synchronisé automatiquement au retour du réseau.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions - Épurées */}
        {!showQRCode && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={submitInProgress}
              className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitInProgress && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>
                {submitInProgress 
                  ? 'Enregistrement...' 
                  : `Enregistrer le don de ${newDon.amount}€`
                }
              </span>
            </button>
          </div>
        )}

        {/* Info pour mode carte - Subtile */}
        {newDon.payment_method === 'carte' && !showQRCode && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Le QR code s'affichera automatiquement pour ce mode de paiement
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
