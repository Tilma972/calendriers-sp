// src/app/admin/layout.tsx - Layout Admin Mobile-First avec Hamburger Menu
'use client';

import { useAuthStore } from '@/shared/stores/auth';
import { AdminGuard } from '@/shared/components/AdminGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminSidebar = () => {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/admin', icon: '📊', label: 'Dashboard', exact: true },
    { href: '/admin/users', icon: '👥', label: 'Utilisateurs' },
    { href: '/admin/teams', icon: '🏢', label: 'Équipes' },
    { href: '/admin/transactions', icon: '💳', label: 'Transactions' },
    { href: '/admin/cheques', icon: '📝', label: 'Chèques' },
    { href: '/admin/pending', icon: '⏳', label: 'En attente' },
    { href: '/admin/receipts', icon: '📧', label: 'Reçus' },
    { href: '/admin/reports', icon: '📋', label: 'Rapports' },
    { href: '/admin/settings', icon: '⚙️', label: 'Paramètres' },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header avec Hamburger */}
      <div className="lg:hidden bg-gray-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ☰
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <span>Admin</span>
          </h1>
        </div>
        
        {/* User info mobile */}
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div className="text-gray-300">{profile?.first_name}</div>
            <div className="text-xs text-gray-300">{profile?.role}</div>
          </div>
          <button
            onClick={signOut}
            className="text-gray-300 hover:text-red-400 text-xl"
            title="Déconnexion"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Sidebar Desktop + Mobile Overlay */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white transform transition-transform duration-300 lg:transform-none
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Header Desktop */}
        <div className="hidden lg:block p-4 mb-6">
          <h1 className="text-xl font-bold mb-2 flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <span>Administration</span>
          </h1>
          <div className="text-sm text-gray-300">
            Interface simplifiée
          </div>
        </div>

        {/* User Info Desktop */}
        <div className="hidden lg:block px-4 mb-6 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-sm font-bold">
              {profile?.first_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-xs text-gray-300 capitalize">
                {profile?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer Desktop */}
        <div className="hidden lg:block p-4 mt-auto">
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-gray-800"
            >
              <span>←</span>
              <span>Retour à l'app</span>
            </Link>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm py-2 px-3 rounded-lg hover:bg-gray-800"
            >
              <span>🚪</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay Background */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50" data-admin>
        <AdminSidebar />
        <main className="flex-1 lg:ml-0 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}