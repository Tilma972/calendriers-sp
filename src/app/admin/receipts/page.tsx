// src/app/admin/receipts/page.tsx - Gestion des Reçus Ultra-Simple
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface RecentReceipt {
  id: string;
  email_to: string;
  status: 'sent' | 'failed' | 'pending';
  receipt_number: string;
  sent_at: string;
  error_message?: string;
  donator_name?: string;
  amount?: number;
  transactions?: {
    donator_name?: string;
    amount?: number;
  };
}

interface TransactionResult {
  id: string;
  donator_email: string;
  donator_name: string;
  amount: number;
  created_at: string;
}

export default function AdminReceiptsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TransactionResult[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);

  useEffect(() => {
    loadRecentReceipts();
  }, []);

  const loadRecentReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select(`
          id,
          email_to,
          status,
          receipt_number,
          sent_at,
          error_message,
          transactions (
            donator_name,
            amount
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transformer les données pour avoir donator_name et amount au niveau principal
      const transformedData = (data || []).map((log: Record<string, unknown>) => {
        const statusRaw = log['status'];
        const allowed = ['sent', 'failed', 'pending'];
        const status = (typeof statusRaw === 'string' && allowed.includes(statusRaw)) ? statusRaw : 'pending';
        const transactions = log['transactions'] as Record<string, unknown> | undefined;
          return {
            ...(log as Record<string, unknown>),
          donator_name: transactions?.['donator_name'] as string | undefined,
          amount: transactions?.['amount'] as number | undefined,
          status,
        } as RecentReceipt;
      }) as RecentReceipt[];

      setRecentReceipts(transformedData);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      toast.error('Erreur lors du chargement des logs');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setIsSearching(true);
      
      // Rechercher par email ou par nom
      const { data, error } = await supabase
        .from('transactions')
        .select('id, donator_email, donator_name, amount, created_at')
        .or(`donator_email.ilike.%${searchTerm}%,donator_name.ilike.%${searchTerm}%`)
        .not('donator_email', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      // Normalize nulls to empty strings for TransactionResult strict typing
      const normalized = (data || []).map((t: unknown) => {
        const tt = t as Record<string, unknown>;
        return {
          id: tt.id as string,
          donator_email: (tt.donator_email as string) ?? '',
          donator_name: (tt.donator_name as string) ?? '',
          amount: tt.amount as number,
          created_at: (tt.created_at as string) ?? '',
        } as TransactionResult;
      });
      setSearchResults(normalized);
      
      if (!data || data.length === 0) {
        toast.error('Aucune transaction trouvée avec cet email ou nom');
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const resendReceipt = async (transactionId: string, email?: string) => {
    try {
      setIsSending(transactionId);
      toast.loading('Envoi du reçu...', { id: 'send-receipt' });

      const response = await fetch('/api/donations/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          force_resend: true
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast.success(`Reçu renvoyé avec succès à ${email}!`, { id: 'send-receipt' });
      
      // Recharger les logs
      loadRecentReceipts();
      
    } catch (error) {
      console.error('Erreur envoi reçu:', error);
      toast.error('Erreur: ' + (error as Error).message, { id: 'send-receipt' });
    } finally {
      setIsSending(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      sent: '✅ Envoyé',
      failed: '❌ Échec', 
      pending: '⏳ En cours'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="admin-receipts-simple space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span className="text-4xl">📧</span>
          <span>Gestion des reçus</span>
        </h1>
        <p className="text-gray-600">Interface simplifiée pour renvoyer les reçus aux donateurs</p>
      </div>

      {/* Section principale : renvoyer un reçu */}
      <section className="renvoyer-recu bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <span>Renvoyer un reçu</span>
        </h2>
        
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <input 
            type="text"
            placeholder="Email du donateur ou nom (ex: dupont@exemple.com)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
          />
          <button 
            type="submit" 
            disabled={isSearching}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSearching && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>🔍</span>
            <span>Trouver</span>
          </button>
        </form>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Transactions trouvées</h3>
            <div className="space-y-2">
              {searchResults.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{transaction.donator_name}</div>
                    <div className="text-sm text-gray-600">{transaction.donator_email}</div>
                    <div className="text-sm text-gray-500">
                      {transaction.amount}€ • {formatDate(transaction.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => resendReceipt(transaction.id, transaction.donator_email)}
                    disabled={isSending === transaction.id}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSending === transaction.id && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span>📧</span>
                    <span>Renvoyer</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Logs simples */}
      <section className="logs-simples bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span>Derniers envois</span>
          </h2>
          <button
            onClick={loadRecentReceipts}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
          >
            <span>🔄</span>
            <span>Actualiser</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Destinataire</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Montant</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentReceipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(receipt.sent_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {receipt.donator_name || 'N/A'}
                      </div>
                      <div className="text-gray-600">{receipt.email_to}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {receipt.amount ? `${receipt.amount}€` : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(receipt.status)}
                    {receipt.error_message && (
                      <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={receipt.error_message}>
                        {receipt.error_message}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {receipt.status === 'failed' && (
                      <button
                        onClick={() => {
                          // Retrouver la transaction et renvoyer
                          setSearchTerm(receipt.email_to);
                          handleSearch({ preventDefault: () => {} } as React.FormEvent);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        <span>🔄</span>
                        <span>Réessayer</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {recentReceipts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun envoi récent de reçu
            </div>
          )}
        </div>
      </section>
    </div>
  );
}