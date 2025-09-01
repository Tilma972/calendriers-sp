// src/app/admin/reports/page.tsx - Exports et Rapports Admin
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface ExportFilters {
  dateFrom: string;
  dateTo: string;
  status: string;
  team_id: string;
  payment_method: string;
}

interface ReportStats {
  total_transactions: number;
  total_amount: number;
  total_calendars: number;
  avg_donation: number;
  transactions_by_method: {
    especes: number;
    cheque: number;
    carte: number;
    virement: number;
  };
  transactions_by_status: {
    pending: number;
    validated_team: number;
    validated_tresorier: number;
    cancelled: number;
  };
}

// Hook pour gestion des exports
function useAdminReports() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [teams, setTeams] = useState<Array<{id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Charger les équipes pour les filtres
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) throw teamsError;
      if (teamsData) setTeams(teamsData);

      // Charger les stats globales
      await calculateStats();

    } catch (error: any) {
      console.error('Erreur chargement rapports:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = async (filters?: Partial<ExportFilters>) => {
    try {
      let query = supabase.from('transactions').select('*');

      // Appliquer les filtres
      if (filters?.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled');
      }
      if (filters?.team_id && filters.team_id !== 'all') {
        query = query.eq('team_id', filters.team_id);
      }
      if (filters?.payment_method && filters.payment_method !== 'all') {
        query = query.eq('payment_method', filters.payment_method as 'especes' | 'cheque' | 'carte' | 'virement');
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const reportStats: ReportStats = {
          total_transactions: data.length,
          total_amount: data.reduce((sum, t) => sum + t.amount, 0),
          total_calendars: data.reduce((sum, t) => sum + t.calendars_given, 0),
          avg_donation: data.length > 0 ? data.reduce((sum, t) => sum + t.amount, 0) / data.length : 0,
          transactions_by_method: {
            especes: data.filter(t => t.payment_method === 'especes').length,
            cheque: data.filter(t => t.payment_method === 'cheque').length,
            carte: data.filter(t => t.payment_method === 'carte').length,
            virement: data.filter(t => t.payment_method === 'virement').length,
          },
          transactions_by_status: {
            pending: data.filter(t => t.status === 'pending').length,
            validated_team: data.filter(t => t.status === 'validated_team').length,
            validated_tresorier: data.filter(t => t.status === 'validated_tresorier').length,
            cancelled: data.filter(t => t.status === 'cancelled').length,
          }
        };
        setStats(reportStats);
      }

    } catch (error: any) {
      console.error('Erreur calcul stats:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const exportTransactions = async (filters: ExportFilters, format: 'csv' | 'excel') => {
  try {
    setIsExporting(true);
    toast.loading('Génération de l\'export...', { id: 'export' });

    // 1. Construire la requête SANS jointures
    let query = supabase.from('transactions').select('*');

    // Appliquer les filtres
    if (filters.dateFrom) {
      query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status as 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled');
    }
    if (filters.team_id !== 'all') {
      query = query.eq('team_id', filters.team_id);
    }
    if (filters.payment_method !== 'all') {
      query = query.eq('payment_method', filters.payment_method as 'especes' | 'cheque' | 'carte' | 'virement');
    }

    query = query.order('created_at', { ascending: false });

    // 2. Exécuter la requête principale
    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      toast.error('Aucune donnée à exporter', { id: 'export' });
      return;
    }

    // 3. Extraire les IDs pour les jointures (avec filtrage des null)
    const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))];
    const teamIds = [...new Set(data.map(t => t.team_id).filter(Boolean))];

    // 4. Charger les données liées en parallèle
    const [profilesRes, teamsRes] = await Promise.all([
      userIds.length > 0 
        ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        : { data: [], error: null },
      teamIds.length > 0 
        ? supabase.from('teams').select('id, name, color').in('id', teamIds)
        : { data: [], error: null }
    ]);

    // 5. Vérifier les erreurs des requêtes parallèles
    if (profilesRes.error) {
      console.warn('Erreur chargement profiles:', profilesRes.error);
    }
    if (teamsRes.error) {
      console.warn('Erreur chargement teams:', teamsRes.error);
    }

    // 6. Créer des maps pour lookup rapide
    const profilesMap = Object.fromEntries(
      (profilesRes.data || []).map(profile => [profile.id, profile])
    );
    const teamsMap = Object.fromEntries(
      (teamsRes.data || []).map(team => [team.id, team])
    );

    // 7. Préparer les données pour l'export avec jointures manuelles
    const exportData = data.map(transaction => {
      const profile = profilesMap[transaction.user_id];
      const team = teamsMap[transaction.team_id];
      
      return {
        'Numéro': transaction.receipt_number || transaction.id.slice(-8),
        'Date': new Date(transaction.created_at).toLocaleDateString('fr-FR'),
        'Heure': new Date(transaction.created_at).toLocaleTimeString('fr-FR'),
        'Sapeur': profile?.full_name || '',
        'Email Sapeur': profile?.email || '',
        'Équipe': team?.name || '',
        'Montant (€)': transaction.amount,
        'Calendriers': transaction.calendars_given,
        'Mode Paiement': transaction.payment_method,
        'Donateur': transaction.donator_name || '',
        'Email Donateur': transaction.donator_email || '',
        'Statut': transaction.status,
        'Validé Équipe': transaction.validated_team_at ? 
          new Date(transaction.validated_team_at).toLocaleDateString('fr-FR') : '',
        'Validé Trésorier': transaction.validated_tresorier_at ? 
          new Date(transaction.validated_tresorier_at).toLocaleDateString('fr-FR') : '',
        'Notes': transaction.notes || ''
      };
    });

    // 8. Télécharger selon le format
    if (format === 'csv') {
      downloadCSV(exportData, 'transactions');
    } else {
      downloadCSV(exportData, 'transactions', true);
    }

    toast.success(`${data.length} transactions exportées`, { id: 'export' });

  } catch (error: any) {
    console.error('Erreur export:', error);
    toast.error(`Erreur: ${error.message}`, { id: 'export' });
  } finally {
    setIsExporting(false);
  }
};

  const exportTeamPerformance = async (filters: ExportFilters) => {
    try {
      setIsExporting(true);
      toast.loading('Export performance équipes...', { id: 'export-teams' });

      // Récupérer les données depuis la vue leaderboard avec filtres de date
      const { data: teamsData, error } = await supabase
        .from('v_teams_leaderboard')
        .select('*')
        .order('total_collecte', { ascending: false });

      if (error) throw error;
      if (!teamsData || teamsData.length === 0) {
        toast.error('Aucune donnée équipe à exporter', { id: 'export-teams' });
        return;
      }

      const exportData = teamsData.map(team => ({
        'Équipe': team.name,
        'Rang': team.rang_global,
        'Tournées Actives': team.nb_tournees_actives || 0,
        'Total Collecté (€)': team.total_collecte || 0,
        'Calendriers Distribués': team.total_calendriers_distribues || 0,
        'Objectif Calendriers': team.calendars_target || 0,
        'Pourcentage Objectif (%)': (team.pourcentage_objectif || 0).toFixed(1),
        'Nombre Transactions': team.total_transactions || 0,
        'Don Moyen (€)': (team.total_transactions ?? 0) > 0 ? 
          ((team.total_collecte || 0) / (team.total_transactions ?? 1)).toFixed(2) : '0'
      }));

      downloadCSV(exportData, 'performance_equipes');
      toast.success(`${teamsData.length} équipes exportées`, { id: 'export-teams' });

    } catch (error: any) {
      console.error('Erreur export équipes:', error);
      toast.error(`Erreur: ${error.message}`, { id: 'export-teams' });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    stats,
    teams,
    isLoading,
    isExporting,
    loadData,
    calculateStats,
    exportTransactions,
    exportTeamPerformance
  };
}

// Fonction utilitaire pour télécharger CSV
function downloadCSV(data: any[], filename: string, asExcel = false) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header];
        // Échapper les guillemets et virgules
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
  ].join('\n');

  // Ajouter BOM pour l'encodage UTF-8 (important pour Excel français)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { 
    type: asExcel ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.${asExcel ? 'xls' : 'csv'}`;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

export default function AdminReportsPage() {
  const {
    stats,
    teams,
    isLoading,
    isExporting,
    loadData,
    calculateStats,
    exportTransactions,
    exportTeamPerformance
  } = useAdminReports();

  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    status: 'all',
    team_id: 'all',
    payment_method: 'all'
  });

  useEffect(() => {
    loadData();
  }, []);

  // Recalculer les stats quand les filtres changent
  useEffect(() => {
    if (!isLoading) {
      calculateStats(filters);
    }
  }, [filters, isLoading]);

  const handleFilterChange = (key: keyof ExportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des rapports...</p>
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
                <a href="/admin" className="text-gray-500 hover:text-gray-700">← Dashboard</a>
                <div className="text-2xl">📊</div>
                <h1 className="text-xl font-bold text-gray-900">Exports & Rapports</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filtres globaux */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtres de Période</h3>
            
            <div className="grid md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="validated_team">Validées équipe</option>
                  <option value="validated_tresorier">Validées final</option>
                  <option value="cancelled">Annulées</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Équipe</label>
                <select
                  value={filters.team_id}
                  onChange={(e) => handleFilterChange('team_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">Toutes les équipes</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paiement</label>
                <select
                  value={filters.payment_method}
                  onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">Tous les modes</option>
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="carte">Carte</option>
                  <option value="virement">Virement</option>
                </select>
              </div>
            </div>
          </div>

          {/* Statistiques temps réel */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-blue-600">{stats.total_transactions}</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-green-600">{stats.total_amount.toFixed(2)}€</div>
                <div className="text-sm text-gray-600">Montant total</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-purple-600">{stats.total_calendars}</div>
                <div className="text-sm text-gray-600">Calendriers</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-orange-600">{stats.avg_donation.toFixed(2)}€</div>
                <div className="text-sm text-gray-600">Don moyen</div>
              </div>
            </div>
          )}

          {/* Répartitions */}
          {stats && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Répartition par mode de paiement */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Mode de Paiement</h3>
                <div className="space-y-3">
                  {Object.entries(stats.transactions_by_method).map(([method, count]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="capitalize">{method === 'especes' ? 'Espèces' : method}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(count / stats.total_transactions) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Répartition par statut */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Statut</h3>
                <div className="space-y-3">
                  {Object.entries(stats.transactions_by_status).map(([status, count]) => {
                    const statusLabels: Record<string, string> = {
                      pending: 'En attente',
                      validated_team: 'Validées équipe',
                      validated_tresorier: 'Validées final',
                      cancelled: 'Annulées'
                    };
                    return (
                      <div key={status} className="flex justify-between items-center">
                        <span>{statusLabels[status]}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(count / stats.total_transactions) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Actions d'export */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Export Transactions */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Transactions</h3>
              <p className="text-gray-600 mb-4">
                Exportez les transactions détaillées avec toutes les informations pour la comptabilité.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => exportTransactions(filters, 'csv')}
                  disabled={isExporting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isExporting ? 'Export...' : 'Export CSV'}
                </button>
                <button
                  onClick={() => exportTransactions(filters, 'excel')}
                  disabled={isExporting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isExporting ? 'Export...' : 'Export Excel'}
                </button>
              </div>
              
              {stats && (
                <div className="mt-3 text-sm text-gray-500">
                  {stats.total_transactions} transactions seront exportées
                </div>
              )}
            </div>

            {/* Export Performance Équipes */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Équipes</h3>
              <p className="text-gray-600 mb-4">
                Tableau de bord complet des performances par équipe avec classements et objectifs.
              </p>
              
              <button
                onClick={() => exportTeamPerformance(filters)}
                disabled={isExporting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isExporting ? 'Export...' : 'Export Performance'}
              </button>
              
              <div className="mt-3 text-sm text-gray-500">
                {teams.length} équipes seront exportées
              </div>
            </div>
          </div>

          {/* Rapports rapides */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Raccourcis Rapports</h3>
            
            <div className="grid md:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }));
                }}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-900">Aujourd'hui</div>
                <div className="text-sm text-gray-500">Activité du jour</div>
              </button>

              <button
                onClick={() => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const today = new Date().toISOString().split('T')[0];
                  setFilters(prev => ({ ...prev, dateFrom: weekAgo, dateTo: today }));
                }}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-900">7 derniers jours</div>
                <div className="text-sm text-gray-500">Semaine écoulée</div>
              </button>

              <button
                onClick={() => {
                  const monthStart = new Date();
                  monthStart.setDate(1);
                  const today = new Date().toISOString().split('T')[0];
                  setFilters(prev => ({ 
                    ...prev, 
                    dateFrom: monthStart.toISOString().split('T')[0], 
                    dateTo: today 
                  }));
                }}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-900">Ce mois</div>
                <div className="text-sm text-gray-500">Mois en cours</div>
              </button>

              <button
                onClick={() => {
                  setFilters(prev => ({ 
                    ...prev, 
                    status: 'validated_tresorier',
                    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dateTo: new Date().toISOString().split('T')[0]
                  }));
                }}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-900">Validées Final</div>
                <div className="text-sm text-gray-500">Comptabilité</div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}