// src/app/admin/pending/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface PendingUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string | null;
  team_id: string | null;
}

export default function AdminPendingUsersPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, team_id')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingUsers(data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Erreur chargement utilisateurs en attente:', error);
        toast.error(`Erreur: ${error.message}`);
      } else {
        console.error('Erreur chargement utilisateurs en attente:', String(error));
        toast.error(`Erreur: ${String(error)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async (userId: string, userName: string) => {
  if (!confirm(`Approuver l\'utilisateur "${userName}" ?`)) return;

    const loadingToast = toast.loading('Approbation en cours...');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${userName} approuvé avec succès !`, { id: loadingToast });
      
      // Retirer de la liste
      setPendingUsers(prev => prev.filter(user => user.id !== userId));

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Erreur approbation:', error);
        toast.error(`Erreur: ${error.message}`, { id: loadingToast });
      } else {
        console.error('Erreur approbation:', String(error));
        toast.error(`Erreur: ${String(error)}`, { id: loadingToast });
      }
    }
  };

  const rejectUser = async (userId: string, userName: string) => {
  if (!confirm(`Rejeter l\'utilisateur "${userName}" ? Cette action supprimera définitivement son compte.`)) return;

    const loadingToast = toast.loading('Rejet en cours...');

    try {
      // Supprimer le profil ET l'utilisateur auth
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Note: La suppression de l'utilisateur auth nécessiterait les droits admin
      // Pour l'instant, on supprime juste le profil
      
      toast.success(`${userName} rejeté et supprimé`, { id: loadingToast });
      
      // Retirer de la liste
      setPendingUsers(prev => prev.filter(user => user.id !== userId));

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Erreur rejet:', error);
        toast.error(`Erreur: ${error.message}`, { id: loadingToast });
      } else {
        console.error('Erreur rejet:', String(error));
        toast.error(`Erreur: ${String(error)}`, { id: loadingToast });
      }
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des demandes...</p>
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
                <div className="text-2xl">⏳</div>
                <h1 className="text-xl font-bold text-gray-900">
                  Demandes d&apos;inscription ({pendingUsers.length})
                </h1>
              </div>
              
              <button
                onClick={loadPendingUsers}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                🔄 Actualiser
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {pendingUsers.length === 0 ? (
            /* État vide */
            <div className="bg-white rounded-lg shadow text-center py-12">
              <div className="text-6xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune demande en attente
              </h3>
              <p className="text-gray-600">
                Toutes les demandes d&apos;inscription ont été traitées.
              </p>
            </div>
          ) : (
            /* Liste des demandes */
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    
                    {/* Infos utilisateur */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-2xl">👤</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.full_name || 'Nom non renseigné'}
                          </h3>
                          <div className="text-sm text-gray-600">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Rôle demandé :</span>
                          <span className="ml-2 capitalize">
                            {user.role?.replace('_', ' ') || 'Sapeur'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Inscription :</span>
                          <span className="ml-2">
                            {user.created_at ? new Date(String(user.created_at)).toLocaleDateString('fr-FR') : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-6">
                      <button
                        onClick={() => approveUser(user.id, user.full_name || user.email)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        ✅ Approuver
                      </button>
                      
                      <button
                        onClick={() => rejectUser(user.id, user.full_name || user.email)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        ❌ Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}