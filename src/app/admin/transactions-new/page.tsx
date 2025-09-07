// src/app/admin/transactions-new/page.tsx - Page Transactions Refactorisée
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  AdminPage, 
  AdminPageHeader, 
  AdminContent, 
  AdminSection,
  AdminGrid,
  AdminStatCard,
  AdminTable,
  AdminModal,
  AdminConfirmModal
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AdminTableFilters } from '@/components/ui/admin/AdminTable';
import { adminTheme, createStatusBadge, getPaymentStyle } from '@/components/ui/admin/admin-theme';

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

// Hook personnalisé (même logique que l'original)
function useAdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Même logique de chargement que l'original
      const { data: transactionsData, error: transactionsError } = await supabase
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
        validated_tresorier_at
      `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (transactionsError) throw transactionsError;

      if (!transactionsData) {
        setTransactions([]);
        return;
      }

      // Logique de jointures manuelles (identique à l'original)
      const userIds = [...new Set(transactionsData.map(t => t.user_id).filter(Boolean))];
      const teamIds = [...new Set(transactionsData.map(t => t.team_id).filter(Boolean))];

      const [profilesResult, teamsResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', userIds.filter(Boolean) as string[])
          : { data: [], error: null },
        teamIds.length > 0
          ? supabase.from('teams').select('id, name, color').in('id', teamIds)
          : { data: [], error: null }
      ]);

      if (profilesResult.error) {
        console.warn('Erreur chargement profiles:', profilesResult.error);
      }
      if (teamsResult.error) {
        console.warn('Erreur chargement teams:', teamsResult.error);
      }

      const profilesMap = Object.fromEntries(
        (profilesResult.data || []).map(profile => [profile.id, profile.full_name])
      );
      const teamsMap = Object.fromEntries(
        (teamsResult.data || []).map(team => [team.id, { name: team.name, color: team.color }])
      );

      const enrichedTransactions: Transaction[] = transactionsData.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        team_id: transaction.team_id,
        tournee_id: transaction.tournee_id,
        amount: transaction.amount,
        calendars_given: transaction.calendars_given,
        payment_method: transaction.payment_method,
        donator_name: transaction.donator_name,
        donator_email: transaction.donator_email,
        status: transaction.status,
        receipt_number: transaction.receipt_number,
        notes: transaction.notes,
        created_at: transaction.created_at,
        validated_team_at: transaction.validated_team_at,
        validated_tresorier_at: transaction.validated_tresorier_at,
        user_name: profilesMap[transaction.user_id] || null,
        team_name: transaction.team_id ? teamsMap[transaction.team_id]?.name || null : null,
        team_color: transaction.team_id ? teamsMap[transaction.team_id]?.color || null : null,
      }));

      setTransactions(enrichedTransactions);

    } catch (error: any) {
      console.error('Erreur chargement transactions:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation individuelle (même logique que l'original)
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

  // Validation en lot (même logique que l'original)
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

export default function AdminTransactionsPageNew() {
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
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkModal, setShowBulkModal] = useState<{ action: 'validate' | 'reject' } | null>(null);
  const [bulkNote, setBulkNote] = useState('');
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Filtrage (même logique que l'original)
  const filteredTransactions = transactions.filter(transaction => {
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesTeam = teamFilter === 'all' || transaction.team_id === teamFilter;

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

    return matchesStatus && matchesTeam && matchesDate && matchesSearch;
  });

  // Stats pour les cartes
  const stats = {
    pending: transactions.filter(t => t.status === 'pending').length,
    validated_team: transactions.filter(t => t.status === 'validated_team').length,
    validated_tresorier: transactions.filter(t => t.status === 'validated_tresorier').length,
    total_amount: transactions
      .filter(t => t.status === 'validated_tresorier')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  // Équipes uniques pour les filtres
  const teams = Array.from(new Map(
    transactions
      .filter(t => t.team_name && t.team_id)
      .map(t => ({ id: t.team_id!, name: t.team_name! }))
      .map(team => [team.id, team])
  ).values());

  // Gestion sélection
  const handleSelectAll = (selected: boolean) => {
    const selectableTransactions = filteredTransactions.filter(t =>
      t.status === 'pending' || t.status === 'validated_team'
    );

    if (selected) {
      setSelectedTransactions(selectableTransactions.map(t => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectRow = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedTransactions([...selectedTransactions, id]);
    } else {
      setSelectedTransactions(selectedTransactions.filter(sid => sid !== id));
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

  // Configuration des colonnes de table
  const tableColumns = [
    {
      key: 'info',
      title: 'Transaction',
      render: (value: any, row: Transaction) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.receipt_number || `#${row.id.slice(-8)}`}
          </div>
          <div className="text-sm text-gray-700">
            {new Date(row.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          {row.donator_name && (
            <div className="text-xs text-gray-600">
              {row.donator_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'team',
      title: 'Équipe/Sapeur',
      render: (value: any, row: Transaction) => (
        <div className="flex items-center gap-2">
          {row.team_color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: row.team_color }}
            />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {row.team_name || 'Aucune équipe'}
            </div>
            <div className="text-sm text-gray-700">
              {row.user_name}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      title: 'Montant',
      render: (value: any, row: Transaction) => (
        <div>
          <div className="text-sm font-bold text-gray-900">
            {row.amount.toFixed(2)}€
          </div>
          <div className="text-xs text-gray-600">
            {row.calendars_given} calendrier(s)
          </div>
        </div>
      )
    },
    {
      key: 'payment_method',
      title: 'Paiement',
      render: (value: string) => {
        const style = getPaymentStyle(value as keyof typeof adminTheme.colors.payment);
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${style.bg} ${style.text}`}>
            {style.icon} {value === 'especes' ? 'Espèces' :
              value === 'cheque' ? 'Chèque' :
                value === 'carte' ? 'Carte' : 'Virement'}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: 'Statut',
      render: (value: string) => {
        const badge = createStatusBadge(value, {
          pending: 'En attente',
          validated_team: 'Valid. équipe',
          validated_tresorier: 'Validé final',
          cancelled: 'Annulé'
        }[value] || value);
        
        return (
          <span className={badge.className}>
            {badge.icon} {badge.text}
          </span>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Transaction) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailModal(row.id);
            }}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Voir détails"
          >
            👁️
          </button>

          {(row.status === 'pending' || row.status === 'validated_team') && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  validateTransaction(row.id, 'validate');
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                title="Valider"
              >
                ✅
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  validateTransaction(row.id, 'reject');
                }}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                title="Rejeter"
              >
                ❌
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Validation Transactions"
        subtitle="Gestion et validation des transactions"
        icon="💳"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Transactions' }
        ]}
        actions={
          <div className="flex gap-2">
            {selectedTransactions.length > 0 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleBulkAction('validate')}
                >
                  Valider ({selectedTransactions.length})
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                >
                  Rejeter ({selectedTransactions.length})
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
            >
              Actualiser
            </Button>
          </div>
        }
      />

      <AdminContent>
        {/* Stats rapides */}
        <AdminSection>
          <AdminGrid cols={4} gap="md">
            <AdminStatCard
              title="En attente"
              value={stats.pending}
              icon="⏳"
              subtitle="À valider"
              onClick={() => setStatusFilter('pending')}
            />
            <AdminStatCard
              title="Validées équipe"
              value={stats.validated_team}
              icon="👥"
              subtitle="En attente admin"
              onClick={() => setStatusFilter('validated_team')}
            />
            <AdminStatCard
              title="Validées final"
              value={stats.validated_tresorier}
              icon="✅"
              subtitle="Terminées"
              onClick={() => setStatusFilter('validated_tresorier')}
            />
            <AdminStatCard
              title="Montant validé"
              value={`${stats.total_amount.toFixed(2)}€`}
              icon="💰"
              subtitle="Total confirmé"
            />
          </AdminGrid>
        </AdminSection>

        {/* Filtres */}
        <AdminSection>
          <AdminTableFilters
            onReset={() => {
              setStatusFilter('all');
              setTeamFilter('all');
              setDateFilter('all');
              setSearchTerm('');
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Recherche"
                placeholder="Nom, donateur, n° reçu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
          </AdminTableFilters>
        </AdminSection>

        {/* Table des transactions */}
        <AdminSection>
          <AdminTable
            columns={tableColumns}
            data={filteredTransactions}
            isLoading={isLoading}
            selectedRows={selectedTransactions}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            onRowClick={(row) => setShowDetailModal(row.id)}
            emptyMessage="Aucune transaction trouvée avec ces critères"
            emptyIcon="💳"
            rowKey="id"
          />
        </AdminSection>
      </AdminContent>

      {/* Modal action en lot */}
      {showBulkModal && (
        <AdminConfirmModal
          isOpen={true}
          onClose={() => setShowBulkModal(null)}
          onConfirm={() => {
            validateBulk(selectedTransactions, showBulkModal.action, bulkNote);
            setShowBulkModal(null);
          }}
          title={`${showBulkModal.action === 'validate' ? 'Valider' : 'Rejeter'} ${selectedTransactions.length} transaction(s)`}
          message={`Êtes-vous sûr de vouloir ${showBulkModal.action === 'validate' ? 'valider' : 'rejeter'} ces transactions ?`}
          type={showBulkModal.action === 'validate' ? 'info' : 'danger'}
          confirmText={showBulkModal.action === 'validate' ? 'Valider' : 'Rejeter'}
        />
      )}

      {/* Modal détails transaction */}
      {showDetailModal && (() => {
        const transaction = transactions.find(t => t.id === showDetailModal);
        if (!transaction) return null;

        return (
          <AdminModal
            isOpen={true}
            onClose={() => setShowDetailModal(null)}
            title="Détails Transaction"
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-sm text-gray-500">Montant</span>
                  <div className="text-2xl font-bold text-gray-900">{transaction.amount.toFixed(2)}€</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Calendriers</span>
                  <div className="text-2xl font-bold text-gray-900">{transaction.calendars_given}</div>
                </div>
              </div>

              <div className="space-y-3">
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
                      <div className="text-sm text-gray-700">{transaction.donator_email}</div>
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

                {transaction.notes && (
                  <div>
                    <span className="text-sm text-gray-500">Notes</span>
                    <div className="text-sm bg-gray-50 p-3 rounded-lg mt-1">
                      {transaction.notes.split('\n').map((line, index) => (
                        <div key={index}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(transaction.status === 'pending' || transaction.status === 'validated_team') && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="primary"
                    onClick={() => {
                      validateTransaction(transaction.id, 'validate');
                      setShowDetailModal(null);
                    }}
                    className="flex-1"
                  >
                    Valider
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      validateTransaction(transaction.id, 'reject');
                      setShowDetailModal(null);
                    }}
                    className="flex-1"
                  >
                    Rejeter
                  </Button>
                </div>
              )}
            </div>
          </AdminModal>
        );
      })()}
    </AdminPage>
  );
}