// src/app/layout.tsx - Layout avec support offline et bypass routes test
'use client';

import { useEffect } from 'react';
// import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import { useAuthStore } from '@/shared/stores/auth';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  // Initialiser l'auth au montage (hydrate le store pour usage client-side)
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <html lang="fr" className={inter.className}>
      <body>
        {children}
        <Toaster position="top-right" />
        <OfflineIndicator />
      </body>
    </html>
  );
}
