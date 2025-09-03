// src/app/admin/cheques/page.tsx - Gestion spécifique des chèques
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface ChequeTransaction {
  id: string;
  amount: number;
  calendars_given: number;
  donator_name: string | null;
  user_name: string | null;
  team_name: string | null;
  cheque_numero: string;
  cheque_banque: string;
  cheque_tireur: string | null;
  cheque_date_emission: string | null;
  cheque_deposited_at: string | null;
  created_at: string;
  status: string;
}

function useAdminCheques() {
  const [cheques, setCheques] = useState<ChequeTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCheques, setSelectedCheques] = useState<string[]>([]);

  const loadCheques = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          calendars_given,
          donator_name,
          cheque_numero,
          cheque_banque,
          cheque_tireur,
          cheque_date_emission,
          cheque_deposited_at,
          created_at,
          status,
          user_id,
          team_id,
          profiles:profiles!transactions_user_id_fkey(full_name),
          teams:teams!transactions_team_id_fkey(name)
        `)
        .eq('payment_method', 'cheque')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement chèques:', error);
        toast.error('Erreur lors de la récupération des transactions : ' + error.message);
        setCheques([]);
        return;
      }

      if (data && Array.isArray(data)) {
        const formattedCheques: ChequeTransaction[] = data.map((t: any) => ({
          id: t.id,
          amount: t.amount,
          calendars_given: t.calendars_given,
          donator_name: t.donator_name,
          user_name: t.profiles?.full_name || null,
          team_name: t.teams?.name || null,
          cheque_numero: t.cheque_numero,
          cheque_banque: t.cheque_banque,
          cheque_tireur: t.cheque_tireur,
          cheque_date_emission: t.cheque_date_emission,
          cheque_deposited_at: t.cheque_deposited_at,
          created_at: t.created_at,
          status: t.status,
        }));
        setCheques(formattedCheques);
      }

    } catch (error: unknown) {
      console.error('Erreur chargement chèques:', error);
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error('Erreur inconnue lors du chargement des chèques');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const markAsDeposited = async (chequeIds: string[]) => {
    try {
      toast.loading('Marquage des chèques comme déposés...', { id: 'deposit' });

      const { error } = await supabase
        .from('transactions')
        .update({ cheque_deposited_at: new Date().toISOString() } as any)
        .in('id', chequeIds);

      if (error) throw error;

    } catch (error: unknown) {
      console.error('Erreur dépôt chèques:', error);
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`, { id: 'deposit' });
      } else {
        toast.error('Erreur inconnue lors du dépôt des chèques', { id: 'deposit' });
      }
    }
  };

  const exportForBank = () => {
    const chequesToExport = cheques.filter(c => selectedCheques.includes(c.id));
    
    if (chequesToExport.length === 0) {
      toast.error('Sélectionnez au moins un chèque à exporter');
      return;
    }

    const csvData = chequesToExport.map(cheque => ({
      'Date Réception': new Date(cheque.created_at).toLocaleDateString('fr-FR'),
      'N° Chèque': cheque.cheque_numero,
      'Banque': cheque.cheque_banque,
      'Tireur': cheque.cheque_tireur || cheque.donator_name || '',
      'Montant': cheque.amount.toFixed(2),
      'Sapeur': cheque.user_name || '',
      'Équipe': cheque.team_name || '',
      'Date Émission': cheque.cheque_date_emission ? 
        new Date(cheque.cheque_date_emission).toLocaleDateString('fr-FR') : '',
    }));

    downloadCSV(csvData, `cheques_depot_${new Date().toISOString().split('T')[0]}`);
    toast.success(`${chequesToExport.length} chèques exportés`);
  };

  return {
    cheques,
    isLoading,
    selectedCheques,
    setSelectedCheques,
    loadCheques,
    markAsDeposited,
    exportForBank
  };
}

// Fonction utilitaire pour CSV
function downloadCSV(data: Record<string, string | number | null>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'), // Point-virgule pour Excel français
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header];
        if (typeof cell === 'string' && (cell.includes(';') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(';')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

export default function AdminChequesPage() {
  const {
    cheques,
    isLoading,
    selectedCheques,
    setSelectedCheques,
    loadCheques,
    markAsDeposited,
    exportForBank
  } = useAdminCheques();

  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    loadCheques();
  }, []);

  const filteredCheques = cheques.filter(cheque => {
    if (filterStatus === 'pending') return !cheque.cheque_deposited_at;
    if (filterStatus === 'deposited') return cheque.cheque_deposited_at;
    return true;
  });

  const handleSelectAll = () => {
    const selectableCheques = filteredCheques.filter(c => !c.cheque_deposited_at);
    
    if (selectedCheques.length === selectableCheques.length) {
      setSelectedCheques([]);
    } else {
      setSelectedCheques(selectableCheques.map(c => c.id));
    }
  };

  const totalAmount = filteredCheques.reduce((sum, c) => sum + c.amount, 0);
  const pendingCount = cheques.filter(c => !c.cheque_deposited_at).length;
  const depositedCount = cheques.filter(c => c.cheque_deposited_at).length;

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des chèques...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <a href="/admin" className="text-gray-500 hover:text-gray-700">← Dashboard</a>
                <div className="text-2xl">📝</div>
                <h1 className="text-xl font-bold text-gray-900">Gestion des Chèques</h1>
              </div>
              
              <div className="flex gap-2">
                {selectedCheques.length > 0 && (
                  <>
                    <button
                      onClick={exportForBank}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Export Banque ({selectedCheques.length})
                    </button>
                    <button
                      onClick={() => markAsDeposited(selectedCheques)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Marquer Déposé ({selectedCheques.length})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
              <div className="text-sm text-gray-600">À déposer</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{depositedCount}</div>
              <div className="text-sm text-gray-600">Déposés</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{filteredCheques.length}</div>
              <div className="text-sm text-gray-600">Total affiché</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{totalAmount.toFixed(2)}€</div>
              <div className="text-sm text-gray-600">Montant affiché</div>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Statut :</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="pending">À déposer</option>
                <option value="deposited">Déposés</option>
                <option value="all">Tous</option>
              </select>
              
              <div className="ml-auto text-sm text-gray-600">
                {selectedCheques.length} sélectionné(s)
              </div>
            </div>
          </div>

          {/* Table des chèques */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCheques.length === filteredCheques.filter(c => !c.cheque_deposited_at).length && 
                                 filteredCheques.filter(c => !c.cheque_deposited_at).length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Chèque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Donateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Sapeur/Équipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Date Réception
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Statut Dépôt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCheques.map((cheque) => (
                    <tr key={cheque.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        {!cheque.cheque_deposited_at && (
                          <input
                            type="checkbox"
                            checked={selectedCheques.includes(cheque.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCheques([...selectedCheques, cheque.id]);
                              } else {
                                setSelectedCheques(selectedCheques.filter(id => id !== cheque.id));
                              }
                            }}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            N° {cheque.cheque_numero}
                          </div>
                          <div className="text-sm text-gray-600">{cheque.cheque_banque}</div>
                          {cheque.cheque_tireur && (
                            <div className="text-xs text-gray-600">
                              Tireur: {cheque.cheque_tireur}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {cheque.amount.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-500">
                          {cheque.calendars_given} calendrier(s)
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cheque.donator_name || 'Non précisé'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cheque.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cheque.team_name}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(cheque.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        {cheque.cheque_date_emission && (
                          <div className="text-xs text-gray-500">
                            Émis le {new Date(cheque.cheque_date_emission).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cheque.cheque_deposited_at ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Déposé le {new Date(cheque.cheque_deposited_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                            À déposer
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredCheques.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <p className="text-gray-500">Aucun chèque trouvé</p>
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}