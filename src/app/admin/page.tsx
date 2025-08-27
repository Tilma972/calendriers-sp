// src/app/admin/page.tsx - Dashboard Admin Principal
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';

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

export default function AdminDashboard() {
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

      // Charger les statistiques principales
      const statsPromises = await Promise.all([
        // Utilisateurs
        supabase.from('profiles').select('id, role, is_active'),
        // Équipes
        supabase.from('teams').select('id, chef_id'),
        // Tournées aujourd'hui
        supabase
          .from('tournees')
          .select('id')
          .gte('started_at', new Date().toISOString().split('T')[0]),
        // Transactions aujourd'hui
        supabase
          .from('transactions')
          .select('amount, status')
          .gte('created_at', new Date().toISOString().split('T')[0]),
        // Transactions en attente
        supabase
          .from('transactions')
          .select('id')
          .eq('status', 'pending'),
      ]);

      const [usersData, teamsData, tourneesTodayData, transactionsTodayData, pendingData] = statsPromises;

      // Calculer les statistiques
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
          .reduce((sum, t) => sum + (t.amount || 0), 0),
        transactions_pending: pendingData.data?.length || 0,
        teams_without_chef: teams.filter(t => !t.chef_id).length,
      };

      setStats(adminStats);

      // Charger l'activité récente
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = (recentTransactions || []).map(t => ({
        id: t.id,
        type: 'transaction',
        description: `Nouveau don de ${t.amount}€`,
        timestamp: t.created_at,
        user_name: t.profiles.full_name ?? 'Utilisateur inconnu',
        amount: t.amount,
      }));

      setRecentActivity(activities);

    } catch (error) {
      console.error('Erreur chargement données admin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du dashboard...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header Admin */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚙️</div>
                <h1 className="text-xl font-bold text-gray-900">Administration</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {profile?.full_name}
                  </div>
                  <div className="text-xs text-gray-500">Trésorier</div>
                </div>
                
                <a
                  href="/"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                >
                  Retour App
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Admin */}
          <nav className="mb-8">
            <div className="flex space-x-1 bg-white p-1 rounded-lg shadow">
              <a
                href="/admin"
                className="bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/admin/users"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Utilisateurs
              </a>
              <a
                href="/admin/teams"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Équipes
              </a>
              <a
                href="/admin/transactions"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Transactions
              </a>
              <a
                href="/admin/settings"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Paramètres
              </a>
            </div>
          </nav>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Utilisateurs */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Utilisateurs Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users_total}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <span className="text-2xl text-blue-600">👥</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.users_sapeurs} sapeurs • {stats.users_chefs} chefs • {stats.users_tresoriers} trésoriers
                </div>
              </div>

              {/* Équipes */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Équipes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.teams_total}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <span className="text-2xl text-green-600">🏆</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.teams_active} avec chef • {stats.teams_without_chef} sans chef
                </div>
              </div>

              {/* Activité Aujourd'hui */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Dons Aujourd'hui</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.transactions_today}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <span className="text-2xl text-yellow-600">💰</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.amount_today.toFixed(2)}€ collectés
                </div>
              </div>

              {/* Alertes */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En Attente</p>
                    <p className="text-2xl font-bold text-red-600">{stats.transactions_pending}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <span className="text-2xl text-red-600">⚠️</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Validations requises
                </div>
              </div>
            </div>
          )}

          {/* Actions Rapides */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Actions Admin */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                <a
                  href="/admin/users/new"
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="text-xl">➕</span>
                  <div>
                    <div className="font-medium">Créer un Utilisateur</div>
                    <div className="text-sm text-gray-500">Ajouter un nouveau sapeur ou chef</div>
                  </div>
                </a>
                
                <a
                  href="/admin/teams/new"
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="text-xl">🏆</span>
                  <div>
                    <div className="font-medium">Créer une Équipe</div>
                    <div className="text-sm text-gray-500">Configurer une nouvelle équipe</div>
                  </div>
                </a>

                {stats?.transactions_pending && stats.transactions_pending > 0 && (
                  <a
                    href="/admin/transactions"
                    className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                  >
                    <span className="text-xl">✅</span>
                    <div>
                      <div className="font-medium text-red-700">Valider Transactions</div>
                      <div className="text-sm text-red-600">{stats.transactions_pending} en attente</div>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Activité Récente */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h3>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                      <span className="text-lg">
                        {activity.type === 'transaction' && '💰'}
                        {activity.type === 'tournee' && '📅'}
                        {activity.type === 'user' && '👤'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{activity.description}</div>
                        <div className="text-sm text-gray-500">
                          {activity.user_name} • {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Aucune activité récente
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alertes Système */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes Système</h3>
            <div className="space-y-3">
              {stats?.teams_without_chef && stats.teams_without_chef > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="font-medium text-orange-800">
                      {stats.teams_without_chef} équipe(s) sans chef
                    </div>
                    <div className="text-sm text-orange-600">
                      Assignez des chefs d'équipe pour optimiser la gestion
                    </div>
                  </div>
                  <a
                    href="/admin/teams"
                    className="ml-auto bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Corriger
                  </a>
                </div>
              )}

              {stats?.transactions_pending === 0 && stats?.transactions_today > 0 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xl">✅</span>
                  <div>
                    <div className="font-medium text-green-800">Toutes les transactions sont validées</div>
                    <div className="text-sm text-green-600">Aucune action requise</div>
                  </div>
                </div>
              )}

              {(!stats?.transactions_today || stats.transactions_today === 0) && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xl">📊</span>
                  <div>
                    <div className="font-medium text-blue-800">Aucune activité aujourd'hui</div>
                    <div className="text-sm text-blue-600">Les statistiques s'afficheront avec les premiers dons</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}