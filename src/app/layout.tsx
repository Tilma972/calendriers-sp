// src/app/layout.tsx - Layout avec support offline
'use client';

import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import { useAuthStore } from '@/shared/stores/auth';
import { AuthForm, useAuthMode } from '@/shared/components/auth/AuthForm';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialize, isInitialized, user, isLoading } = useAuthStore();
  const { mode, toggleMode } = useAuthMode();

  // Initialiser l'auth au montage
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Loading state pendant l'initialisation
  if (!isInitialized || isLoading) {
    return (
      <html lang="fr" className={inter.className}>
        <head>
          <title>Calendriers SP</title>
          <meta name="description" content="Application calendriers sapeurs-pompiers" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
            <div className="text-center">
              <div className="text-6xl mb-4">🔥</div>
              <h1 className="text-2xl font-bold text-red-800 mb-4">
                Calendriers SP
              </h1>
              <div className="flex items-center justify-center gap-3 text-red-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                <span>Chargement...</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // Si pas connecté, afficher l'écran d'auth
  if (!user) {
    return (
      <html lang="fr" className={inter.className}>
        <head>
          <title>Connexion - Calendriers SP</title>
          <meta name="description" content="Application calendriers sapeurs-pompiers" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body>
          <AuthForm mode={mode} onToggleMode={toggleMode} />
        </body>
      </html>
    );
  }

  // Si connecté, afficher l'app normale avec support offline
  return (
    <html lang="fr" className={inter.className}>
      <head>
        <title>Calendriers SP</title>
        <meta name="description" content="Application calendriers sapeurs-pompiers" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* PWA Meta tags */}
        <meta name="theme-color" content="#DC2626" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
        {/* Indicateur offline global */}
        <OfflineIndicator />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
