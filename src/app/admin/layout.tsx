// src/app/admin/layout.tsx - Layout Admin Complet et Fonctionnel
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
  LogOut,
  X
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

// Sidebar avec état géré par le parent
const AdminSidebar = ({ isMenuOpen, setIsMenuOpen }: { 
  isMenuOpen: boolean; 
  setIsMenuOpen: (open: boolean) => void; 
}) => {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();

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

  const handleSignOut = async () => {
    try {
      await signOut();
      // La redirection est gérée par le store auth
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname, setIsMenuOpen]);

  return (
    <>
      {/* Mobile Header avec Hamburger */}
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
              <span className="text-lg font-semibold text-gray-900">Admin</span>
            </Link>
          </div>
          
          {/* User info mobile */}
          <div className="flex items-center gap-3">
            <div className="text-right text-sm hidden sm:block">
              <div className="text-gray-900 font-medium">{profile?.full_name || profile?.email}</div>
              <div className="text-xs text-gray-500">{profile?.role}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Desktop + Mobile Overlay */}
      <div className={cn(
        'fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:transform-none flex flex-col',
        isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header sidebar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                SP
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Admin</div>
                <div className="text-xs text-gray-500">Sapeurs-Pompiers</div>
              </div>
            </Link>
            
            {/* Close button mobile */}
            <button
              onClick={closeMobileMenu}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.href, item.exact);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                  active
                    ? 'bg-red-50 text-red-600 border-r-2 border-red-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="px-3 py-2 text-xs text-gray-500">
            Connecté en tant que
          </div>
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">
              {profile?.full_name || profile?.email}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {profile?.role?.replace('_', ' ')}
            </div>
          </div>
          
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'app</span>
          </Link>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
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

// Layout principal
export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Gérer le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    // Cleanup au démontage du composant
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isMenuOpen]);

  return (
    <AdminGuard>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar avec état géré */}
        <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        
        {/* Contenu principal */}
        <div className="flex flex-1 flex-col lg:ml-0">
          <main className="flex-1 overflow-y-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}