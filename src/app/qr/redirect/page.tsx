// src/app/qr/redirect/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, ExternalLink, Clock, XCircle, CheckCircle, Smartphone } from 'lucide-react';

interface QRInteraction {
  interaction_id: string;
  team_id: string;
  team_name?: string;
  team_color?: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  expires_at: string;
  amount: number;
  calendars_count: number;
  stripe_payment_link_url?: string;
}

export default function QRRedirectPage() {
  const searchParams = useSearchParams();
  const interactionId = searchParams.get('id');
  
  const [interaction, setInteraction] = useState<QRInteraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!interactionId) {
      setError('ID d\'interaction manquant dans l\'URL');
      setLoading(false);
      return;
    }

    // call loader
    (async () => { await loadInteraction(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionId]);

  // Timer pour countdown
  useEffect(() => {
    if (!interaction || interaction.status !== 'pending') return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiration = new Date(interaction.expires_at).getTime();
      const remaining = Math.max(0, expiration - now);
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setInteraction(prev => prev ? { ...prev, status: 'expired' } : null);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [interaction]);

  const loadInteraction = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'interaction avec les informations de l'équipe
      const id = String(interactionId);
      const { data, error } = await supabase
        .from('qr_interactions')
        .select(`
          *,
          teams:team_id (
            name,
            color,
            stripe_payment_link_url
          )
        `)
  .eq('interaction_id', id)
        .single();

      if (error) {
        console.error('Error loading QR interaction:', error);
        setError('Interaction QR introuvable ou invalide');
        return;
      }

      if (!data) {
        setError('Interaction QR introuvable');
        return;
      }

      // Vérifier si l'interaction n'a pas déjà expiré
  const now = new Date().getTime();
  const expiration = new Date(data.expires_at ?? '').getTime();
      
      if (now > expiration && data.status === 'pending') {
        setError('Ce QR code a expiré');
        return;
      }

      const interactionData: QRInteraction = {
        interaction_id: String(data.interaction_id),
        team_id: String(data.team_id),
        team_name: data.teams?.name ?? 'Équipe inconnue',
        team_color: data.teams?.color ?? '#dc2626',
        status: (data.status as QRInteraction['status']) ?? 'pending',
        expires_at: String(data.expires_at ?? ''),
        amount: Number(data.amount ?? 10),
        calendars_count: Number(data.calendars_count ?? 1),
        stripe_payment_link_url: data.teams?.stripe_payment_link_url ?? undefined
      };

      setInteraction(interactionData);

      // Si l'interaction est terminée, afficher un message
      if (data.status === 'completed') {
        return;
      }

      // Si l'interaction est expirée
      if (data.status === 'expired') {
        setError('Ce QR code a expiré');
        return;
      }

      // Si pas de Payment Link configuré
      if (!data.teams?.stripe_payment_link_url) {
        setError('Paiement non configuré pour cette équipe');
        return;
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error in loadInteraction:', message);
      setError('Erreur lors du chargement de l\'interaction');
    } finally {
      setLoading(false);
    }
  };

  const redirectToStripe = async () => {
    if (!interaction?.stripe_payment_link_url) {
      setError('URL de paiement non disponible');
      return;
    }

    try {
      setRedirecting(true);
      
      // Ajouter les metadata pour identifier l'interaction dans Stripe
      const stripeUrl = new URL(interaction.stripe_payment_link_url);
      stripeUrl.searchParams.set('client_reference_id', interaction.interaction_id);
      
      // Optionnel: pré-remplir l'email si on l'a
      // stripeUrl.searchParams.set('prefilled_email', '');
      
      console.log('🔗 Redirecting to Stripe:', stripeUrl.toString());
      
      // Redirection vers Stripe
      window.location.href = stripeUrl.toString();
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error redirecting to Stripe:', message);
      setError('Erreur lors de la redirection vers le paiement');
      setRedirecting(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Chargement...
          </h1>
          <p className="text-gray-600">
            Vérification de votre demande de paiement
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-900 mb-2">
            QR Code invalide
          </h1>
          <p className="text-red-700 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.close()}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!interaction) {
    return null;
  }

  if (interaction.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-green-900 mb-2">
            Paiement déjà effectué
          </h1>
          <p className="text-green-700 mb-6">
            Ce don a déjà été traité avec succès.
          </p>
          <button
            onClick={() => window.close()}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header avec logo/emoji des sapeurs-pompiers */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Don pour les Sapeurs-Pompiers
          </h1>
          <p className="text-gray-600">
            Calendriers {new Date().getFullYear() + 1}
          </p>
        </div>

        {/* Informations du don */}
        <div 
          className="rounded-xl p-4 mb-6"
          style={{ 
            backgroundColor: `${interaction.team_color}20`,
            borderColor: interaction.team_color,
            borderWidth: '2px'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 font-medium">Équipe :</span>
            <span className="font-bold" style={{ color: interaction.team_color }}>
              {interaction.team_name}
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 font-medium">Calendriers :</span>
            <span className="font-bold text-gray-900">{interaction.calendars_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Montant :</span>
            <span className="text-2xl font-bold text-gray-900">{interaction.amount}€</span>
          </div>
        </div>

        {/* Countdown */}
        {timeRemaining > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-orange-800">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg">
                Temps restant : {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-900 mb-3">
            <Smartphone className="w-5 h-5" />
            <h3 className="font-semibold">Paiement sécurisé</h3>
          </div>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Paiement traité par Stripe (sécurisé)</li>
            <li>• Cartes acceptées : Visa, Mastercard, AMEX</li>
            <li>• Reçu automatique par email</li>
            <li>• Aucune donnée stockée sur nos serveurs</li>
          </ul>
        </div>

        {/* Bouton de paiement */}
        <button
          onClick={redirectToStripe}
          disabled={redirecting || timeRemaining === 0}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3 text-lg"
        >
          {redirecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirection...
            </>
          ) : timeRemaining === 0 ? (
            <>
              <XCircle className="w-5 h-5" />
              Expiré
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              Payer {interaction.amount}€
            </>
          )}
        </button>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Merci de votre soutien aux Sapeurs-Pompiers</p>
          <p>Paiement sécurisé • SSL • Protection des données</p>
        </div>
      </div>
    </div>
  );
}