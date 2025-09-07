// src/components/QRCodeDisplay.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAuthStore } from '@/shared/stores/auth';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, RefreshCw, QrCode, Clock, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { playPaymentSuccess, playPaymentError, playNotification } from '@/utils/sounds';

interface QRCodeDisplayProps {
  teamId: string;
  teamName: string;
  teamColor?: string;
  onSuccess?: (transactionId: string) => void;
  onExpired?: () => void;
  className?: string;
}

interface QRInteraction {
  interaction_id: string;
  stripe_payment_link_url: string;
  expires_at: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  donator_name?: string;
  donator_email?: string;
  amount?: number;
}

export default function QRCodeDisplay({ 
  teamId, 
  teamName, 
  teamColor = '#dc2626', 
  onSuccess, 
  onExpired,
  className = '' 
}: QRCodeDisplayProps) {
  const { profile } = useAuthStore();
  const [qrInteraction, setQrInteraction] = useState<QRInteraction | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'generating' | 'active' | 'completed' | 'expired' | 'error'>('idle');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string>('');
  
  // Refs pour les timers
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const statusCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const realtimeSubscription = useRef<any>(null);

  // Nettoyer les timers à la destruction du composant
  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (statusCheckTimer.current) clearInterval(statusCheckTimer.current);
      if (realtimeSubscription.current) {
        realtimeSubscription.current.unsubscribe();
      }
    };
  }, []);

  // Générer un nouveau QR code
  const generateQRCode = async () => {
    if (!profile?.team_id || profile.team_id !== teamId) {
      setError('Vous devez appartenir à cette équipe pour générer un QR code');
      return;
    }

    setStatus('generating');
    setError('');

    try {
      // Appeler l'API pour initier une interaction QR
      const response = await fetch('/api/qr/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const interaction: QRInteraction = await response.json();
      setQrInteraction(interaction);

      // Créer l'URL de redirection avec l'interaction_id
      const redirectUrl = `${window.location.origin}/qr/redirect?id=${interaction.interaction_id}`;
      
      // Générer le QR code
      const qrDataUrl = await QRCode.toDataURL(redirectUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      setQrCodeDataUrl(qrDataUrl);
      setStatus('active');

      // Démarrer le countdown
      startCountdown(interaction.expires_at);
      
      // Démarrer le monitoring de statut
      startStatusMonitoring(interaction.interaction_id);
      
      // S'abonner aux notifications temps réel
      subscribeToRealtimeNotifications(interaction.interaction_id);

    } catch (err: any) {
      console.error('Error generating QR code:', err);
      setError(err.message || 'Erreur lors de la génération du QR code');
      setStatus('error');
      playPaymentError();
    }
  };

  // Démarrer le countdown
  const startCountdown = (expiresAt: string) => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiration - now);
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setStatus('expired');
        playNotification();
        onExpired?.();
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
        }
      }
    };

    // Mise à jour immédiate
    updateCountdown();
    
    // Puis toutes les secondes
    countdownTimer.current = setInterval(updateCountdown, 1000);
  };

  // Monitoring périodique du statut dans la base
  const startStatusMonitoring = (interactionId: string) => {
    statusCheckTimer.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('qr_interactions')
          .select('status, donator_name, donator_email, completed_at')
          .eq('interaction_id', interactionId)
          .single();

        if (error) {
          console.error('Error checking QR status:', error);
          return;
        }

        if (data?.status === 'completed') {
          setStatus('completed');
          setQrInteraction(prev => prev ? { ...prev, ...data } : null);
          
          // Jouer le son de succès
          playPaymentSuccess();
          
          if (statusCheckTimer.current) {
            clearInterval(statusCheckTimer.current);
          }
          
          // Notifier le parent
          onSuccess?.(data.transaction_id);
        } else if (data?.status === 'expired') {
          setStatus('expired');
          onExpired?.();
          
          if (statusCheckTimer.current) {
            clearInterval(statusCheckTimer.current);
          }
        }
      } catch (err: any) {
        console.error('Error monitoring QR status:', err);
      }
    }, 3000); // Vérifier toutes les 3 secondes
  };

  // S'abonner aux notifications temps réel Supabase
  const subscribeToRealtimeNotifications = (interactionId: string) => {
    const channel = supabase.channel('qr-payments')
      .on('broadcast', { event: 'qr_payment_completed' }, (payload) => {
        if (payload.payload.interactionId === interactionId) {
          console.log('🎉 QR payment completed via realtime!', payload.payload);
          
          setStatus('completed');
          setQrInteraction(prev => prev ? {
            ...prev,
            status: 'completed',
            donator_name: payload.payload.donatorName,
            donator_email: payload.payload.donatorEmail
          } : null);
          
          // Jouer le son de succès
          playPaymentSuccess();
          
          // Arrêter le monitoring
          if (statusCheckTimer.current) {
            clearInterval(statusCheckTimer.current);
          }
          
          // Notifier le parent
          onSuccess?.(payload.payload.transactionId);
        }
      })
      .subscribe();

    realtimeSubscription.current = channel;
  };

  // Reset pour générer un nouveau QR code
  const resetQRCode = () => {
    // Nettoyer les timers
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    if (statusCheckTimer.current) clearInterval(statusCheckTimer.current);
    if (realtimeSubscription.current) {
      realtimeSubscription.current.unsubscribe();
    }

    // Reset state
    setQrInteraction(null);
    setQrCodeDataUrl('');
    setStatus('idle');
    setTimeRemaining(0);
    setError('');
  };

  // Formater le temps restant
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Animation de pulsation pour le QR code actif
  const qrCodeClasses = status === 'active' 
    ? 'animate-pulse-slow border-green-300' 
    : status === 'completed' 
      ? 'border-green-500' 
      : status === 'expired' 
        ? 'border-red-500' 
        : 'border-gray-300';

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <QrCode className="w-6 h-6" style={{ color: teamColor }} />
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Paiement QR Code
            </h3>
            <p className="text-sm text-gray-600">
              {teamName} • Calendrier 10€
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        {status !== 'idle' && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'active' ? 'bg-blue-100 text-blue-800' :
            status === 'completed' ? 'bg-green-100 text-green-800' :
            status === 'expired' ? 'bg-red-100 text-red-800' :
            status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status === 'active' && '🔄 Actif'}
            {status === 'completed' && '✅ Payé'}
            {status === 'expired' && '⏰ Expiré'}
            {status === 'generating' && '⏳ Génération...'}
            {status === 'error' && '❌ Erreur'}
          </div>
        )}
      </div>

      {/* Contenu principal */}
      {status === 'idle' && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-12 h-12 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Prêt pour le paiement mobile
          </h4>
          <p className="text-gray-600 mb-6">
            Générez un QR code pour permettre aux donateurs de payer par carte bancaire
          </p>
          <button
            onClick={generateQRCode}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Générer QR Code
          </button>
        </div>
      )}

      {status === 'generating' && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Génération du QR code...
          </h4>
          <p className="text-gray-600">
            Création de votre lien de paiement sécurisé
          </p>
        </div>
      )}

      {status === 'active' && qrCodeDataUrl && (
        <div className="text-center">
          {/* QR Code */}
          <div className={`inline-block p-4 bg-white border-4 rounded-2xl mb-6 ${qrCodeClasses}`}>
            <img 
              src={qrCodeDataUrl} 
              alt="QR Code de paiement" 
              className="w-64 h-64 mx-auto"
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center justify-center gap-2">
              <Smartphone className="w-5 h-5" />
              Instructions
            </h4>
            <ol className="text-sm text-blue-800 text-left space-y-1">
              <li>1. Le donateur scanne ce QR code</li>
              <li>2. Il est redirigé vers le paiement Stripe</li>
              <li>3. Après paiement, vous recevez une notification</li>
              <li>4. La transaction est automatiquement enregistrée</li>
            </ol>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-lg font-mono text-gray-700 mb-4">
            <Clock className="w-5 h-5" />
            <span>Expire dans : {formatTimeRemaining(timeRemaining)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={resetQRCode}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Nouveau QR
            </button>
          </div>
        </div>
      )}

      {status === 'completed' && qrInteraction && (
        <div className="text-center py-8">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-green-900 mb-2">
            Paiement réussi ! 🎉
          </h4>
          <div className="bg-green-50 rounded-xl p-4 mb-4">
            <p className="text-green-800">
              <strong>Donateur :</strong> {qrInteraction.donator_name || 'Anonyme'}
            </p>
            {qrInteraction.donator_email && (
              <p className="text-green-800 text-sm">
                <strong>Email :</strong> {qrInteraction.donator_email}
              </p>
            )}
            <p className="text-green-800">
              <strong>Montant :</strong> {qrInteraction.amount || 10}€
            </p>
          </div>
          <button
            onClick={resetQRCode}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Nouveau don QR
          </button>
        </div>
      )}

      {status === 'expired' && (
        <div className="text-center py-8">
          <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-red-900 mb-2">
            QR Code expiré
          </h4>
          <p className="text-red-700 mb-6">
            Ce QR code a expiré après 10 minutes d'inactivité.
            Générez-en un nouveau pour continuer.
          </p>
          <button
            onClick={resetQRCode}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Générer un nouveau QR
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-8">
          <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-red-900 mb-2">
            Erreur
          </h4>
          <p className="text-red-700 mb-6">
            {error}
          </p>
          <button
            onClick={resetQRCode}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}

// Animation CSS personnalisée pour le pulse lent
const styles = `
  @keyframes animate-pulse-slow {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  
  .animate-pulse-slow {
    animation: animate-pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// Ajouter les styles au document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}