// src/app/pending/page.tsx
'use client';

import { useAuthStore } from '@/shared/stores/auth';

export default function PendingValidationPage() {
  const { user, profile, signOut } = useAuthStore();

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est maintenant actif, rediriger
  if (profile.is_active) {
    window.location.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        
        {/* Icône d'attente */}
        <div className="text-6xl mb-6">⏳</div>
        
        {/* Titre */}
        <h1 className="text-2xl font-bold text-orange-800 mb-4">
          Compte en attente de validation
        </h1>
        
        {/* Message principal */}
        <div className="text-gray-700 mb-6 space-y-3">
          <p>
            Bonjour <strong>{profile.full_name}</strong>,
          </p>
          <p>
            Votre inscription a bien &eacute;t&eacute; prise en compte ! Votre compte est actuellement en attente de validation par un administrateur.
          </p>
          <p className="text-sm text-gray-600">
            Vous recevrez une notification par email dès que votre compte sera activé.
          </p>
        </div>

        {/* Informations du compte */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-orange-800 mb-2">Informations du compte :</h3>
          <div className="text-sm text-orange-700 space-y-1">
            <div><strong>Email :</strong> {user.email}</div>
            <div><strong>Nom :</strong> {profile.full_name}</div>
            <div><strong>Rôle demandé :</strong> {profile.role?.replace('_', ' ') || 'Sapeur'}</div>
            <div><strong>Date d&apos;inscription :</strong> {new Date(user.created_at).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // Rafraîchir le profil pour vérifier le statut
              window.location.reload();
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            🔄 Vérifier le statut
          </button>

          <button
            onClick={() => {
              if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                signOut();
              }
            }}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Se déconnecter
          </button>
        </div>

        {/* Contact */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            En cas de probl&egrave;me, contactez votre tr&eacute;sorier ou l&apos;administration.
          </p>
        </div>

        {/* Debug en développement */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left">
            <strong>Debug :</strong>
            <pre>{JSON.stringify({ 
              is_active: profile.is_active, 
              role: profile.role 
            }, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}