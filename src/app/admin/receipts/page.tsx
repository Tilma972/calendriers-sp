// src/app/admin/receipts/page.tsx - Interface gestion des reçus
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { emailService } from '@/shared/services/emailService';
import { useAuthStore } from '@/shared/stores/auth';

interface Transaction {
  id: string;
  amount: number;
  calendars_given: number;
  payment_method: string;
  donator_name?: string;
  donator_email?: string;
  receipt_number?: string;
  receipt_url?: string;
  created_at: string;
  status: string;
}

export default function ReceiptsPage() {
  const { user, profile } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReceipts, setSendingReceipts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'with_email' | 'without_receipt'>('with_email');

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
          .is('receipt_number', null);
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
  const handleSendReceipt = async (transactionId: string) => {
    if (sendingReceipts.has(transactionId)) return;

    setSendingReceipts(prev => new Set([...prev, transactionId]));

    try {
      const result = await emailService.processReceiptForTransaction(transactionId);
      
      if (result.success) {
        alert(`✅ Reçu envoyé avec succès ! N° ${result.receiptNumber}`);
        // Recharger la transaction mise à jour
        loadTransactions();
      } else {
        alert(`❌ Erreur envoi reçu: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Erreur envoi reçu:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setSendingReceipts(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
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
              Sans reçu envoyé
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
                          {transaction.receipt_number ? (
                            <div className="flex items-center text-sm text-green-600">
                              <span className="mr-1">✅</span>
                              {transaction.receipt_number}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              Non envoyé
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {transaction.donator_email && (
                            <button
                              onClick={() => handleSendReceipt(transaction.id)}
                              disabled={sendingReceipts.has(transaction.id)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                sendingReceipts.has(transaction.id)
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : transaction.receipt_number
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {sendingReceipts.has(transaction.id) ? (
                                <>
                                  <span className="inline-block animate-spin mr-1">⏳</span>
                                  Envoi...
                                </>
                              ) : transaction.receipt_number ? (
                                '🔄 Renvoyer'
                              ) : (
                                '📧 Envoyer reçu'
                              )}
                            </button>
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
          <h4 className="font-semibold text-blue-900 mb-2">💡 Instructions</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Les reçus sont envoyés automatiquement lors de la création d'une transaction si un email est fourni</li>
            <li>• Utilisez cette page pour renvoyer des reçus ou en envoyer pour les anciens dons</li>
            <li>• Le numéro de reçu est généré automatiquement au format SP-AAAAMMJJ-XXXXXX</li>
            <li>• Les reçus sont envoyés depuis no-reply@pompiers34800.com</li>
          </ul>
        </div>
      </main>
    </div>
  );
}