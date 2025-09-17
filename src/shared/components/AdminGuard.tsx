// src/shared/components/AdminGuard.tsx
'use client';

import { useAuthStore } from '@/shared/stores/auth';
import Link from 'next/link';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des droits d&apos;accès...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'tresorier') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accès Refusé
          </h1>
             <p className="text-gray-600 mb-6">
               {"Cette section est réservée aux trésoriers. Vous n"}
               {"'"}
               {"avez pas les permissions nécessaires pour accéder à l'administration."}
             </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
            <p className="text-sm text-gray-500">
              Votre rôle actuel : <span className="font-medium capitalize">{profile?.role?.replace('_', ' ')}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}