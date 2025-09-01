// src/app/admin/receipts/page.tsx - Interface gestion des reçus (Version n8n + Gotenberg)
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/shared/stores/auth';
import { useReceipts, useReceiptStats } from '@/shared/hooks/useReceipts';
import { ReceiptService } from '@/shared/lib/receipt-service';

interface Transaction {
  id: string;
  amount: number;
  calendars_given: number;
  payment_method: string;
  donator_name?: string;
  donator_email?: string;
  receipt_number?: string;
  receipt_url?: string;
  receipt_status?: 'pending' | 'generated' | 'failed' | 'sent' | null;
  receipt_generated_at?: string | null;
  receipt_pdf_url?: string | null;
  created_at: string;
  status: string;
}

export default function ReceiptsPage() {
  const { user, profile } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { 
    isGenerating, 
    isTestingConnection,
    generateReceipt, 
    generateTestReceipt, 
    processPendingReceipts,
    testN8nConnection,
    validateConfiguration,
    refreshStats 
  } = useReceipts();
  const { stats, isLoading: statsLoading, successRate } = useReceiptStats();
  const [filter, setFilter] = useState<'all' | 'with_email' | 'without_receipt' | 'pending' | 'failed'>('with_email');
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>(null);

  // Charger les transactions
  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Appliquer les filtres
      if (filter === 'with_email') {
        query = query.not('donator_email', 'is', null);
      } else if (filter === 'without_receipt') {
        query = query
          .not('donator_email', 'is', null)
          .is('receipt_status', null);
      } else if (filter === 'pending') {
        query = query.eq('receipt_status', 'pending');
      } else if (filter === 'failed') {
        query = query.eq('receipt_status', 'failed');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur chargement transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Envoyer un reçu manuellement
  const handleSendReceipt = async (transactionId: string, testMode: boolean = false) => {
    try {
      const result = await generateReceipt(transactionId, { 
        autoSend: !testMode,
        quality: testMode ? 'draft' : 'standard'
      });
      
      if (result.success) {
        const message = testMode 
          ? `✅ PDF de test généré ! Workflow ID: ${result.workflowId}`
          : `✅ Reçu envoyé avec succès ! Workflow ID: ${result.workflowId}`;
        alert(message);
        loadTransactions();
        refreshStats();
      } else {
        alert(`❌ Erreur: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Erreur envoi reçu:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  // Traiter tous les reçus en attente
  const handleProcessPendingReceipts = async () => {
    if (!confirm('Traiter tous les reçus en attente ? Cette opération peut prendre du temps.')) {
      return;
    }

    try {
      const result = await processPendingReceipts();
      alert(`✅ Traitement terminé: ${result.succeeded}/${result.processed} reçus envoyés`);
      loadTransactions();
      refreshStats();
    } catch (error: any) {
      alert(`❌ Erreur traitement batch: ${error.message}`);
    }
  };

  // Test de connexion n8n
  const handleTestConnection = async () => {
    try {
      const result = await testN8nConnection();
      if (result.success) {
        alert('✅ Connexion n8n OK !');
      } else {
        alert(`❌ Erreur connexion n8n: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Erreur test: ${error.message}`);
    }
  };

  // Valider la configuration
  const handleValidateConfig = async () => {
    try {
      const result = await validateConfiguration();
      setConfig(result);
      setShowConfig(true);
    } catch (error: any) {
      alert(`❌ Erreur validation config: ${error.message}`);
    }
  };

  // Générer un reçu de test
  const handleTestReceipt = async () => {
    try {
      const result = await generateTestReceipt();
      if (result.success) {
        alert(`✅ Reçu de test généré ! Workflow ID: ${result.workflowId}`);
      } else {
        alert(`❌ Erreur test: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message}`);
    }
  };

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
              <div className="text-2xl">📧</div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Reçus</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total reçus</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⏳</div>
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Générés</p>
                <p className="text-2xl font-bold text-green-600">{stats.generated + stats.sent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">❌</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Échecs</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎯</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Taux succès</p>
                <p className="text-2xl font-bold text-blue-600">{successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions de gestion */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Actions rapides</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleProcessPendingReceipts}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isGenerating ? '⏳ Traitement...' : '📧 Traiter reçus en attente'}
            </button>
            
            <button
              onClick={handleTestReceipt}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? '⏳ Test...' : '🧪 Test reçu'}
            </button>

            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {isTestingConnection ? '⏳ Test...' : '🔗 Test n8n'}
            </button>

            <button
              onClick={handleValidateConfig}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
            >
              ⚙️ Config
            </button>
          </div>
        </div>

        {/* Configuration (affichée sur demande) */}
        {showConfig && config && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold">Configuration n8n</h3>
              <button 
                onClick={() => setShowConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className={`p-3 rounded ${config.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`font-medium ${config.isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {config.isValid ? '✅ Configuration valide' : '❌ Configuration invalide'}
                </p>
              </div>

              {config.configuration && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">URL n8n</p>
                    <p className="text-sm text-gray-900 font-mono">
                      {config.configuration.n8nUrl || 'Non configuré'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Clé API</p>
                    <p className="text-sm text-gray-900">
                      {config.configuration.hasApiKey ? '🔑 Configurée' : '❌ Non configurée'}
                    </p>
                  </div>
                </div>
              )}

              {config.validation.missing.length > 0 && (
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-sm font-medium text-red-800 mb-1">Variables manquantes:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {config.validation.missing.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {config.validation.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Avertissements:</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {config.validation.warnings.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Filtres</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes les transactions
            </button>
            <button
              onClick={() => setFilter('with_email')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'with_email'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Avec email donateur
            </button>
            <button
              onClick={() => setFilter('without_receipt')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'without_receipt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sans reçu ({transactions.filter(t => !t.receipt_status && t.donator_email).length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏳ En attente ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ Échecs ({stats.failed})
            </button>
          </div>
        </div>

        {/* Liste des transactions */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des transactions...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Transactions ({transactions.length})
              </h3>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <p>Aucune transaction trouvée pour ce filtre.</p>
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
                        Donateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reçu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.donator_name || 'Anonyme'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.calendars_given} calendrier{(transaction.calendars_given || 1) > 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-600">
                            {transaction.amount}€
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {transaction.payment_method}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.donator_email ? (
                            <div className="text-sm text-blue-600">
                              {transaction.donator_email}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              Aucun email
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.receipt_status === 'sent' || transaction.receipt_status === 'generated' ? (
                            <div className="flex items-center text-sm text-green-600">
                              <span className="mr-1">✅</span>
                              <div>
                                <div>{transaction.receipt_number || 'Généré'}</div>
                                {transaction.receipt_generated_at && (
                                  <div className="text-xs text-gray-500">
                                    {new Date(transaction.receipt_generated_at).toLocaleDateString('fr-FR')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : transaction.receipt_status === 'pending' ? (
                            <div className="flex items-center text-sm text-orange-600">
                              <span className="mr-1">⏳</span>
                              En cours...
                            </div>
                          ) : transaction.receipt_status === 'failed' ? (
                            <div className="flex items-center text-sm text-red-600">
                              <span className="mr-1">❌</span>
                              Échec
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              Non envoyé
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.donator_email && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSendReceipt(transaction.id, false)}
                                disabled={isGenerating || transaction.receipt_status === 'pending'}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  isGenerating || transaction.receipt_status === 'pending'
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : transaction.receipt_status === 'sent' || transaction.receipt_status === 'generated'
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : transaction.receipt_status === 'failed'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {transaction.receipt_status === 'pending' ? (
                                  <>
                                    <span className="inline-block animate-pulse mr-1">⏳</span>
                                    En cours...
                                  </>
                                ) : transaction.receipt_status === 'sent' || transaction.receipt_status === 'generated' ? (
                                  '🔄 Renvoyer'
                                ) : transaction.receipt_status === 'failed' ? (
                                  '🔄 Réessayer'
                                ) : (
                                  '📧 Envoyer'
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleSendReceipt(transaction.id, true)}
                                disabled={isGenerating}
                                className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                                title="Test PDF seulement"
                              >
                                🧪
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Instructions - Système n8n + Gotenberg</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Nouveau système :</strong> Les reçus sont générés via n8n + Gotenberg pour un PDF professionnel</li>
            <li>• <strong>Génération automatique :</strong> Les reçus sont traités en arrière-plan lors des transactions</li>
            <li>• <strong>Statuts :</strong> ⏳ En attente → ✅ Généré/Envoyé → ❌ Échec</li>
            <li>• <strong>Actions :</strong> 📧 Envoyer/Renvoyer le reçu • 🧪 Tester la génération PDF</li>
            <li>• <strong>Monitoring :</strong> Utilisez les statistiques et la config pour surveiller le système</li>
            <li>• <strong>Format :</strong> Numéro de reçu RECU-YYYY-MM-DD-XXXXXX</li>
          </ul>
        </div>
      </main>
    </div>
  );
}