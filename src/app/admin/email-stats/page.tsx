// src/app/admin/email-stats/page.tsx - Statistiques détaillées des emails
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { EmailLogService } from '@/shared/services/storageService';
import { useAuthStore } from '@/shared/stores/auth';

interface EmailStats {
  totalSent: number;
  successfulSent: number;
  failedSent: number;
  bouncedSent: number;
  openedCount: number;
  clickedCount: number;
  openRatePercent: number;
  dateSent: string;
}

interface RecentEmailLog {
  id: string;
  email_to: string;
  email_subject: string;
  status: string;
  receipt_number: string;
  email_provider: string;
  sent_at: string;
  opened_at: string;
  error_message: string;
  created_at: string;
}

export default function EmailStatsPage() {
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<EmailStats[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  // Charger les statistiques
  useEffect(() => {
    loadEmailStats();
    loadRecentLogs();
  }, [timeRange]);

  const loadEmailStats = async () => {
    try {
      const statsData = await EmailLogService.getEmailStats(timeRange);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erreur logs récents:', error);
        return;
      }

      setRecentLogs(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les stats globales
  const globalStats = stats.reduce((acc, day) => ({
    totalSent: acc.totalSent + day.totalSent,
    successfulSent: acc.successfulSent + day.successfulSent,
    failedSent: acc.failedSent + day.failedSent,
    openedCount: acc.openedCount + day.openedCount,
  }), { totalSent: 0, successfulSent: 0, failedSent: 0, openedCount: 0 });

  const globalOpenRate = globalStats.successfulSent > 0 
    ? Math.round((globalStats.openedCount / globalStats.successfulSent) * 100)
    : 0;

  const successRate = globalStats.totalSent > 0 
    ? Math.round((globalStats.successfulSent / globalStats.totalSent) * 100)
    : 0;

  // Grouper les logs par status
  const logsByStatus = recentLogs.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Grouper par provider
  const logsByProvider = recentLogs.reduce((acc, log) => {
    const provider = log.email_provider || 'Inconnu';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Vérifier les permissions
  if (!user || !profile || !['chef_equipe', 'tresorier'].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600">Cette page est réservée aux chefs d'équipe et trésoriers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <a href="/admin" className="text-gray-500 hover:text-gray-700">
                ← Admin
              </a>
              <div className="text-2xl">📈</div>
              <h1 className="text-xl font-bold text-gray-900">Statistiques Emails</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value={7}>7 derniers jours</option>
                <option value={30}>30 derniers jours</option>
                <option value={90}>90 derniers jours</option>
                <option value={365}>1 année</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Envoyés</p>
                <p className="text-3xl font-bold text-blue-600">{globalStats.totalSent}</p>
              </div>
              <div className="text-3xl">📧</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Taux de Succès</p>
                <p className="text-3xl font-bold text-green-600">{successRate}%</p>
                <p className="text-sm text-gray-500">{globalStats.successfulSent} réussis</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Taux d'Ouverture</p>
                <p className="text-3xl font-bold text-purple-600">{globalOpenRate}%</p>
                <p className="text-sm text-gray-500">{globalStats.openedCount} ouvertures</p>
              </div>
              <div className="text-3xl">👁️</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Échecs</p>
                <p className="text-3xl font-bold text-red-600">{globalStats.failedSent}</p>
                <p className="text-sm text-gray-500">emails ratés</p>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Distribution par status */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Status des Emails</h3>
            </div>
            <div className="p-6">
              {Object.entries(logsByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      status === 'sent' ? 'bg-green-500' :
                      status === 'opened' ? 'bg-blue-500' :
                      status === 'failed' ? 'bg-red-500' :
                      status === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></span>
                    <span className="capitalize font-medium">{status}</span>
                  </div>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution par provider */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Providers Email</h3>
            </div>
            <div className="p-6">
              {Object.entries(logsByProvider)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([provider, count]) => (
                <div key={provider} className="flex justify-between items-center mb-3">
                  <span className="font-medium">{provider}</span>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-200 rounded-full h-2 w-20">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min(100, (count / Math.max(...Object.values(logsByProvider))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="font-bold text-sm w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs récents */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Logs Récents</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reçu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ouvert
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleDateString('fr-FR')}
                        <br />
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.email_to.length > 25 ? 
                            log.email_to.substring(0, 25) + '...' : 
                            log.email_to
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.receipt_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'sent' ? 'bg-green-100 text-green-800' :
                          log.status === 'opened' ? 'bg-blue-100 text-blue-800' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800' :
                          log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.email_provider || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.opened_at ? (
                          <div>
                            ✅ {new Date(log.opened_at).toLocaleDateString('fr-FR')}
                            <br />
                            <span className="text-xs">
                              {new Date(log.opened_at).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Note explicative */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📊 À propos de ces statistiques</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Taux de succès</strong> : Pourcentage d'emails envoyés sans erreur</li>
            <li>• <strong>Taux d'ouverture</strong> : Pourcentage d'emails ouverts (tracking pixel)</li>
            <li>• <strong>Providers</strong> : Détection automatique du fournisseur email (Gmail, Outlook, etc.)</li>
            <li>• Le tracking d'ouverture nécessite que les images soient activées dans le client email</li>
            <li>• Les statistiques sont mises à jour en temps réel</li>
          </ul>
        </div>
      </main>
    </div>
  );
}