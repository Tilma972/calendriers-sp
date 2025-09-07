// src/app/admin/dashboard-new/page.tsx - Dashboard Admin Amélioré
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { supabase } from '@/shared/lib/supabase';
import Link from 'next/link';
import { 
  AdminPage, 
  AdminPageHeader, 
  AdminContent, 
  AdminSection, 
  AdminGrid,
  AdminCard,
  AdminStatCard
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';
import { adminClassNames, createStatusBadge } from '@/components/ui/admin/admin-theme';

interface AdminStats {
  users_total: number;
  users_active: number;
  users_sapeurs: number;
  users_chefs: number;
  users_tresoriers: number;
  teams_total: number;
  teams_active: number;
  tournees_today: number;
  transactions_today: number;
  amount_today: number;
  transactions_pending: number;
  teams_without_chef: number;
}

interface RecentActivity {
  id: string;
  type: 'transaction' | 'tournee' | 'user';
  description: string;
  timestamp: string;
  user_name: string;
  amount?: number;
}

export default function AdminDashboardNew() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);

      // Charger les statistiques principales (même logique que l'original)
      const statsPromises = await Promise.all([
        supabase.from('profiles').select('id, role, is_active'),
        supabase.from('teams').select('id, chef_id'),
        supabase
          .from('tournees')
          .select('id')
          .gte('started_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('transactions')
          .select('amount, status')
          .gte('created_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('transactions')
          .select('id')
          .eq('status', 'pending'),
        supabase
          .from('profiles')
          .select('id')
          .eq('is_active', false),
      ]);

      const [usersData, teamsData, tourneesTodayData, transactionsTodayData, pendingData, pendingUsersData] = statsPromises;

      const users = usersData.data || [];
      const teams = teamsData.data || [];
      const transactionsToday = transactionsTodayData.data || [];

      const adminStats: AdminStats = {
        users_total: users.length,
        users_active: users.filter(u => u.is_active).length,
        users_sapeurs: users.filter(u => u.role === 'sapeur').length,
        users_chefs: users.filter(u => u.role === 'chef_equipe').length,
        users_tresoriers: users.filter(u => u.role === 'tresorier').length,
        teams_total: teams.length,
        teams_active: teams.filter(t => t.chef_id).length,
        tournees_today: tourneesTodayData.data?.length || 0,
        transactions_today: transactionsToday.length,
        amount_today: transactionsToday
          .filter(t => t.status !== 'cancelled')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0),
        transactions_pending: pendingData.data?.length || 0,
        teams_without_chef: teams.filter(t => !t.chef_id).length,
      };

      setStats(adminStats);

      // Charger l'activité récente (même logique que l'original mais simplifiée)
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('id, amount, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentTransactions && recentTransactions.length > 0) {
        const activities: RecentActivity[] = recentTransactions.map(t => ({
          id: t.id,
          type: 'transaction',
          description: `Nouveau don de ${t.amount}€`,
          timestamp: t.created_at,
          user_name: 'Sapeur',
          amount: Number(t.amount),
        }));
        setRecentActivity(activities);
      }

    } catch (error: any) {
      console.error('Erreur chargement données admin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminPage>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className={adminClassNames.spinner} />
            <p className="text-gray-600 mt-4">Chargement du dashboard...</p>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de l'administration"
        icon="📊"
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Dashboard' }
        ]}
        actions={
          <Button 
            variant="secondary" 
            size="sm"
            onClick={loadAdminData}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </Button>
        }
      />

      <AdminContent>
        {/* Stats Grid Améliorées */}
        {stats && (
          <AdminSection title="Statistiques Principales">
            <AdminGrid cols={4} gap="md">
              <AdminStatCard
                title="Utilisateurs"
                value={stats.users_total}
                icon="👥"
                subtitle={`${stats.users_active} actifs`}
                trend={{ 
                  value: Math.round((stats.users_active / stats.users_total) * 100), 
                  isPositive: true 
                }}
                onClick={() => window.location.href = '/admin/users'}
              />

              <AdminStatCard
                title="Équipes"
                value={stats.teams_total}
                icon="🏢"
                subtitle={`${stats.teams_active} avec chef`}
                trend={{ 
                  value: stats.teams_without_chef, 
                  isPositive: false 
                }}
                onClick={() => window.location.href = '/admin/teams'}
              />

              <AdminStatCard
                title="Dons Aujourd'hui"
                value={stats.transactions_today}
                icon="💰"
                subtitle={`${stats.amount_today.toFixed(2)}€ collectés`}
                onClick={() => window.location.href = '/admin/transactions'}
              />

              <AdminStatCard
                title="En Attente"
                value={stats.transactions_pending}
                icon="⏳"
                subtitle="Validations requises"
                trend={stats.transactions_pending > 0 ? { 
                  value: stats.transactions_pending, 
                  isPositive: false 
                } : undefined}
                onClick={() => window.location.href = '/admin/transactions?filter=pending'}
              />
            </AdminGrid>
          </AdminSection>
        )}

        {/* Section Actions et Activité */}
        <AdminGrid cols={2} gap="lg">
          {/* Actions Rapides Améliorées */}
          <AdminSection>
            <AdminCard
              title="Actions Rapides"
              subtitle="Raccourcis administrateur"
              icon="⚡"
            >
              <div className="space-y-3">
                <Link
                  href="/admin/users"
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
                >
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Gérer les Utilisateurs</div>
                    <div className="text-sm text-gray-600">Créer, modifier, désactiver</div>
                  </div>
                </Link>

                <Link
                  href="/admin/teams"
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
                >
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Gérer les Équipes</div>
                    <div className="text-sm text-gray-600">Configurer les équipes</div>
                  </div>
                </Link>

                {stats?.transactions_pending && stats.transactions_pending > 0 && (
                  <Link
                    href="/admin/transactions?filter=pending"
                    className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                  >
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-red-800">Valider Transactions</div>
                      <div className="text-sm text-red-600">{stats.transactions_pending} en attente</div>
                    </div>
                  </Link>
                )}
              </div>
            </AdminCard>
          </AdminSection>

          {/* Activité Récente Améliorée */}
          <AdminSection>
            <AdminCard
              title="Activité Récente"
              subtitle="Dernières actions sur la plateforme"
              icon="📈"
            >
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                      <div className="p-2 bg-green-50 rounded-full text-green-600">
                        💰
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {activity.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {activity.user_name} • {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Aucune activité récente</p>
                  </div>
                )}
              </div>
            </AdminCard>
          </AdminSection>
        </AdminGrid>

        {/* Alertes Système Améliorées */}
        {stats && (
          <AdminSection title="Alertes et Notifications">
            <div className="space-y-4">
              {stats.teams_without_chef > 0 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600 text-xl">
                    ⚠️
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-orange-800">
                      {stats.teams_without_chef} équipe(s) sans chef
                    </div>
                    <div className="text-sm text-orange-600 mt-1">
                      Assignez des chefs d'équipe pour optimiser la gestion des tournées
                    </div>
                  </div>
                  <Link
                    href="/admin/teams"
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Corriger
                  </Link>
                </div>
              )}

              {stats.transactions_pending === 0 && stats.transactions_today > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600 text-xl">
                    ✅
                  </div>
                  <div>
                    <div className="font-medium text-green-800">
                      Toutes les transactions sont validées
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Aucune action requise pour aujourd'hui
                    </div>
                  </div>
                </div>
              )}

              {(!stats.transactions_today || stats.transactions_today === 0) && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 text-xl">
                    📊
                  </div>
                  <div>
                    <div className="font-medium text-blue-800">
                      Aucune activité aujourd'hui
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      Les statistiques s'afficheront avec les premières transactions
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AdminSection>
        )}
      </AdminContent>
    </AdminPage>
  );
}