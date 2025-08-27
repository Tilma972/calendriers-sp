// src/app/admin/transactions/page.tsx - Validation Transactions Admin
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface Transaction {
  id: string;
  user_id: string;
  team_id: string | null;
  tournee_id: string | null;
  amount: number;
  calendars_given: number;
  payment_method: 'especes' | 'cheque' | 'carte' | 'virement';
  donator_name: string | null;
  donator_email: string | null;
  status: 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled';
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  validated_team_at: string | null;
  validated_tresorier_at: string | null;
  // Données jointes
  user_name: string | null;
  team_name: string | null;
  team_color: string | null;
}

interface ValidationNote {
  transaction_id: string;
  note: string;
  action: 'validate' | 'reject';
}

// Hook personnalisé pour la gestion des transactions
function useAdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          team_id,
          tournee_id,
          amount,
          calendars_given,
          payment_method,
          donator_name,
          donator_email,
          status,
          receipt_number,
          notes,
          created_at,
          validated_team_at,
          validated_tresorier_at,
          profiles!transactions_user_id_fkey(full_name),
          teams!transactions_team_id_fkey(name, color)
        `)
        .order('created_at', { ascending: false })
        .limit(200); // Limiter pour la performance

      if (error) throw error;

      if (data) {
        const formattedTransactions: Transaction[] = data.map(t => ({
          id: t.id,
          user_id: t.user_id,
          team_id: t.team_id,
          tournee_id: t.tournee_id,
          amount: t.amount,
          calendars_given: t.calendars_given,
          payment_method: t.payment_method,
          donator_name: t.donator_name,
          donator_email: t.donator_email,
          status: t.status,
          receipt_number: t.receipt_number,
          notes: t.notes,
          created_at: t.created_at,
          validated_team_at: t.validated_team_at,
          validated_tresorier_at: t.validated_tresorier_at,
          user_name: t.profiles?.full_name || null,
          team_name: t.teams?.name || null,
          team_color: t.teams?.color || null,
        }));
        setTransactions(formattedTransactions);
      }

    } catch (error: any) {
      console.error('Erreur chargement transactions:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation individuelle avec mise à jour optimiste
  const validateTransaction = async (transactionId: string, action: 'validate' | 'reject', note?: string) => {
    const originalTransaction = transactions.find(t => t.id === transactionId);
    if (!originalTransaction) return;

    const newStatus = action === 'validate' ? 'validated_tresorier' : 'cancelled';
    
    // Mise à jour optimiste
    setTransactions(prev =>
      prev.map(t =>
        t.id === transactionId
          ? { 
              ...t, 
              status: newStatus as any,
              validated_tresorier_at: action === 'validate' ? new Date().toISOString() : null
            }
          : t
      )
    );

    const actionText = action === 'validate' ? 'Validation' : 'Rejet';
    toast.loading(`${actionText} en cours...`, { id: `validate-${transactionId}` });

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: newStatus,
          validated_tresorier_at: action === 'validate' ? new Date().toISOString() : null,
          notes: note ? `${originalTransaction.notes || ''}${originalTransaction.notes ? '\n' : ''}Admin: ${note}` : originalTransaction.notes
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success(`Transaction ${action === 'validate' ? 'validée' : 'rejetée'}`, { id: `validate-${transactionId}` });
      
      // Retirer de la sélection
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));

    } catch (error: any) {
      // Rollback
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId ? originalTransaction : t
        )
      );
      
      console.error('Erreur validation:', error);
      toast.error(`Erreur: ${error.message}`, { id: `validate-${transactionId}` });
    }
  };

  // Validation en lot optimisée
  const validateBulk = async (transactionIds: string[], action: 'validate' | 'reject', note?: string) => {
    if (transactionIds.length === 0) return;

    const originalTransactions = transactions.filter(t => transactionIds.includes(t.id));
    const newStatus = action === 'validate' ? 'validated_tresorier' : 'cancelled';
    
    // Mise à jour optimiste
    setTransactions(prev =>
      prev.map(t =>
        transactionIds.includes(t.id)
          ? { 
              ...t, 
              status: newStatus as any,
              validated_tresorier_at: action === 'validate' ? new Date().toISOString() : null,
              notes: note ? `${t.notes || ''}${t.notes ? '\n' : ''}Admin: ${note}` : t.notes
            }
          : t
      )
    );

    const actionText = action === 'validate' ? 'Validation' : 'Rejet';
    toast.loading(`${actionText} de ${transactionIds.length} transactions...`, { id: 'validate-bulk' });

    try {
      // Approche plus sûre : mise à jour une par une pour éviter les problèmes SQL
      const updatePromises = transactionIds.map(transactionId => {
        const originalTransaction = originalTransactions.find(t => t.id === transactionId);
        const updatedNotes = note ? 
          `${originalTransaction?.notes || ''}${originalTransaction?.notes ? '\n' : ''}Admin: ${note}` : 
          originalTransaction?.notes;

        return supabase
          .from('transactions')
          .update({
            status: newStatus,
            validated_tresorier_at: action === 'validate' ? new Date().toISOString() : null,
            notes: updatedNotes
          })
          .eq('id', transactionId);
      });

      const results = await Promise.all(updatePromises);
      
      // Vérifier les erreurs
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} transaction(s) ont échoué`);
      }

      toast.success(`${transactionIds.length} transactions ${action === 'validate' ? 'validées' : 'rejetées'}`, { id: 'validate-bulk' });
      setSelectedTransactions([]);

    } catch (error: any) {
      // Rollback
      setTransactions(prev =>
        prev.map(t => {
          const original = originalTransactions.find(o => o.id === t.id);
          return original || t;
        })
      );
      
      console.error('Erreur validation bulk:', error);
      toast.error(`Erreur: ${error.message}`, { id: 'validate-bulk' });
    }
  };

  return { 
    transactions, 
    isLoading, 
    selectedTransactions, 
    setSelectedTransactions,
    loadData, 
    validateTransaction,
    validateBulk
  };
}

export default function AdminTransactionsPage() {
  const { 
    transactions, 
    isLoading, 
    selectedTransactions, 
    setSelectedTransactions,
    loadData, 
    validateTransaction,
    validateBulk
  } = useAdminTransactions();
  
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkModal, setShowBulkModal] = useState<{ action: 'validate' | 'reject' } | null>(null);
  const [bulkNote, setBulkNote] = useState('');
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Filtrage des transactions avec tous les critères
  const filteredTransactions = transactions.filter(transaction => {
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesTeam = teamFilter === 'all' || transaction.team_id === teamFilter;
    const matchesUser = userFilter === 'all' || transaction.user_id === userFilter;
    
    // Filtre par période
    const transactionDate = new Date(transaction.created_at);
    const now = new Date();
    let matchesDate = true;
    
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchesDate = transactionDate >= today;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = transactionDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = transactionDate >= monthAgo;
    }
    
    const matchesSearch = 
      transaction.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.donator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesTeam && matchesUser && matchesDate && matchesSearch;
  });

  // Stats pour le header
  const stats = {
    pending: transactions.filter(t => t.status === 'pending').length,
    validated_team: transactions.filter(t => t.status === 'validated_team').length,
    validated_tresorier: transactions.filter(t => t.status === 'validated_tresorier').length,
    total_amount: transactions
      .filter(t => t.status === 'validated_tresorier')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  // Équipes et utilisateurs uniques pour les filtres
  const teams = Array.from(new Set(
    transactions
      .filter(t => t.team_name && t.team_id)
      .map(t => ({ id: t.team_id!, name: t.team_name!, color: t.team_color! }))
      .map(t => JSON.stringify(t))
  )).map(t => JSON.parse(t));

  const users = Array.from(new Set(
    transactions
      .filter(t => t.user_name && t.user_id)
      .map(t => ({ id: t.user_id, name: t.user_name! }))
      .map(t => JSON.stringify(t))
  )).map(t => JSON.parse(t));

  // Gestion sélection
  const handleSelectAll = () => {
    const selectableTransactions = filteredTransactions.filter(t => 
      t.status === 'pending' || t.status === 'validated_team'
    );
    
    if (selectedTransactions.length === selectableTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(selectableTransactions.map(t => t.id));
    }
  };

  const handleBulkAction = (action: 'validate' | 'reject') => {
    if (selectedTransactions.length === 0) {
      toast.error('Aucune transaction sélectionnée');
      return;
    }
    setShowBulkModal({ action });
    setBulkNote('');
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des transactions...</p>
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
                <div className="text-2xl">💳</div>
                <h1 className="text-xl font-bold text-gray-900">Validation Transactions</h1>
              </div>
              
              <div className="flex gap-2">
                {selectedTransactions.length > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkAction('validate')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Valider ({selectedTransactions.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction('reject')}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Rejeter ({selectedTransactions.length})
                    </button>
                  </>
                )}
                <button
                  onClick={loadData}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.validated_team}</div>
              <div className="text-sm text-gray-600">Validées équipe</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.validated_tresorier}</div>
              <div className="text-sm text-gray-600">Validées final</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{stats.total_amount.toFixed(2)}€</div>
              <div className="text-sm text-gray-600">Montant validé</div>
            </div>
          </div>

          {/* Filtres étendus */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">Toutes les équipes</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sapeur</label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">Tous les sapeurs</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">Toutes les dates</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <input
                  type="text"
                  placeholder="Nom, donateur, n° reçu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
            
            {/* Boutons de remise à zéro et stats */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTeamFilter('all');
                  setUserFilter('all');
                  setDateFilter('all');
                  setSearchTerm('');
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Réinitialiser les filtres
              </button>
              
              <div className="text-sm text-gray-600">
                {filteredTransactions.length} transaction(s) affichée(s) sur {transactions.length} • {selectedTransactions.length} sélectionnée(s)
              </div>
            </div>
          </div>

          {/* Table des transactions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.length === filteredTransactions.filter(t => 
                          t.status === 'pending' || t.status === 'validated_team'
                        ).length && filteredTransactions.filter(t => 
                          t.status === 'pending' || t.status === 'validated_team'
                        ).length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Équipe/Sapeur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paiement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        {(transaction.status === 'pending' || transaction.status === 'validated_team') && (
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTransactions([...selectedTransactions, transaction.id]);
                              } else {
                                setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id));
                              }
                            }}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.receipt_number || `#${transaction.id.slice(-8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {transaction.donator_name && (
                            <div className="text-xs text-gray-500">
                              {transaction.donator_name}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {transaction.team_color && (
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.team_color }}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.team_name || 'Aucune équipe'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.user_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {transaction.amount.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.calendars_given} calendrier(s)
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.payment_method === 'carte' ? 'bg-blue-100 text-blue-800' :
                          transaction.payment_method === 'cheque' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.payment_method === 'especes' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {transaction.payment_method === 'especes' ? 'Espèces' :
                           transaction.payment_method === 'cheque' ? 'Chèque' :
                           transaction.payment_method === 'carte' ? 'Carte' : 'Virement'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          transaction.status === 'validated_team' ? 'bg-blue-100 text-blue-800' :
                          transaction.status === 'validated_tresorier' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'pending' ? 'En attente' :
                           transaction.status === 'validated_team' ? 'Valid. équipe' :
                           transaction.status === 'validated_tresorier' ? 'Validé final' : 'Annulé'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowDetailModal(transaction.id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            👁️
                          </button>
                          
                          {(transaction.status === 'pending' || transaction.status === 'validated_team') && (
                            <>
                              <button
                                onClick={() => validateTransaction(transaction.id, 'validate')}
                                className="text-green-600 hover:text-green-800"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => validateTransaction(transaction.id, 'reject')}
                                className="text-red-600 hover:text-red-800"
                              >
                                ❌
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Message si aucune transaction */}
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💳</div>
              <p className="text-gray-500">Aucune transaction trouvée</p>
            </div>
          )}

          {/* Modal action en lot */}
          {showBulkModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {showBulkModal.action === 'validate' ? 'Valider' : 'Rejeter'} {selectedTransactions.length} transaction(s)
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (optionnelle)
                  </label>
                  <textarea
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                    rows={3}
                    placeholder="Ajouter une note explicative..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowBulkModal(null);
                      setBulkNote('');
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      validateBulk(selectedTransactions, showBulkModal.action, bulkNote);
                      setShowBulkModal(null);
                      setBulkNote('');
                    }}
                    className={`flex-1 font-medium py-2 px-4 rounded-md transition-colors ${
                      showBulkModal.action === 'validate' 
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {showBulkModal.action === 'validate' ? 'Valider' : 'Rejeter'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal détails transaction */}
          {showDetailModal && (() => {
            const transaction = transactions.find(t => t.id === showDetailModal);
            if (!transaction) return null;
            
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Détails Transaction
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Montant</span>
                        <div className="font-bold text-lg">{transaction.amount.toFixed(2)}€</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Calendriers</span>
                        <div className="font-bold text-lg">{transaction.calendars_given}</div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500">Sapeur</span>
                      <div className="font-medium">{transaction.user_name}</div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500">Équipe</span>
                      <div className="font-medium flex items-center gap-2">
                        {transaction.team_color && (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: transaction.team_color }}
                          />
                        )}
                        {transaction.team_name || 'Aucune équipe'}
                      </div>
                    </div>
                    
                    {transaction.donator_name && (
                      <div>
                        <span className="text-sm text-gray-500">Donateur</span>
                        <div className="font-medium">{transaction.donator_name}</div>
                        {transaction.donator_email && (
                          <div className="text-sm text-gray-500">{transaction.donator_email}</div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-gray-500">Mode de paiement</span>
                      <div className="font-medium capitalize">
                        {transaction.payment_method === 'especes' ? 'Espèces' :
                         transaction.payment_method === 'cheque' ? 'Chèque' :
                         transaction.payment_method === 'carte' ? 'Carte bancaire' : 'Virement'}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500">Date de création</span>
                      <div className="font-medium">
                        {new Date(transaction.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    
                    {transaction.validated_team_at && (
                      <div>
                        <span className="text-sm text-gray-500">Validée équipe le</span>
                        <div className="font-medium">
                          {new Date(transaction.validated_team_at).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    )}
                    
                    {transaction.validated_tresorier_at && (
                      <div>
                        <span className="text-sm text-gray-500">Validée trésorier le</span>
                        <div className="font-medium">
                          {new Date(transaction.validated_tresorier_at).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    )}
                    
                    {transaction.notes && (
                      <div>
                        <span className="text-sm text-gray-500">Notes</span>
                        <div className="text-sm bg-gray-50 p-2 rounded mt-1">
                          {transaction.notes.split('\n').map((line, index) => (
                            <div key={index}>{line}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={() => setShowDetailModal(null)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Fermer
                    </button>
                    
                    {(transaction.status === 'pending' || transaction.status === 'validated_team') && (
                      <>
                        <button
                          onClick={() => {
                            validateTransaction(transaction.id, 'validate');
                            setShowDetailModal(null);
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => {
                            validateTransaction(transaction.id, 'reject');
                            setShowDetailModal(null);
                          }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </AdminGuard>
  );
}