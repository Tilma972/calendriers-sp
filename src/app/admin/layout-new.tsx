// src/app/admin/layout-new.tsx - Layout Admin Amélioré avec Design System
'use client';

import { useAuthStore } from '@/shared/stores/auth';
import { AdminGuard } from '@/shared/components/AdminGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/shared/lib/utils';
import { adminClassNames } from '@/components/ui/admin/admin-theme';
import { 
  BarChart3, 
  Users, 
  Building2, 
  CreditCard, 
  FileText, 
  Clock, 
  Mail, 
  FileBarChart,
  Settings,
  TestTube,
  Menu,
  ArrowLeft,
  LogOut
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  badge?: string | number;
}

const AdminSidebar = () => {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: '/admin', icon: BarChart3, label: 'Dashboard', exact: true },
    { href: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { href: '/admin/teams', icon: Building2, label: 'Équipes' },
    { href: '/admin/transactions', icon: CreditCard, label: 'Transactions', badge: 3 },
    { href: '/admin/cheques', icon: FileText, label: 'Chèques' },
    { href: '/admin/pending', icon: Clock, label: 'En attente' },
    { href: '/admin/receipts', icon: Mail, label: 'Reçus' },
    { href: '/admin/reports', icon: FileBarChart, label: 'Rapports' },
    { href: '/admin/settings', icon: Settings, label: 'Paramètres' },
    // Lien de test temporaire
    { href: '/admin/design-test', icon: TestTube, label: 'Test Design' }
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href) && pathname !== '/admin/design-test';
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Header avec Hamburger - Amélioré */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                SP
              </div>
              <span className="font-semibold text-gray-900">Admin</span>
            </Link>
          </div>
          
          {/* User info mobile */}
          <div className="flex items-center gap-3">
            <div className="text-right text-sm hidden sm:block">
              <div className="font-medium text-gray-900">{profile?.first_name}</div>
              <div className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</div>
            </div>
            <div className="relative">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm font-semibold">
                {profile?.first_name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Desktop + Mobile Overlay - Amélioré */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:transform-none lg:translate-x-0',
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        
        {/* Header Desktop - Amélioré */}
        <div className="hidden lg:block p-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              SP
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Administration</h1>
              <p className="text-xs text-gray-500">Calendriers SP</p>
            </div>
          </Link>
        </div>

        {/* User Info Desktop - Amélioré */}
        <div className="hidden lg:block px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold">
              {profile?.first_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {profile?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Améliorée */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  active 
                    ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Desktop - Amélioré */}
        <div className="hidden lg:block p-4 border-t border-gray-200 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-600 hover:text-gray-900 text-sm py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'app</span>
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 text-gray-600 hover:text-red-600 text-sm py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay Background - Amélioré */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default function AdminLayoutNew({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 lg:ml-0 overflow-hidden">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}