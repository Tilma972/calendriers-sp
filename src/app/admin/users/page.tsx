// src/app/admin/users/page.tsx - Version complète avec gestion d'erreur
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast'; // À installer: npm install react-hot-toast

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'sapeur' | 'chef_equipe' | 'tresorier';
  team_id: string | null;
  team_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

// Hook personnalisé pour la gestion des utilisateurs admin
function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Charger utilisateurs SANS jointure
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
        id,
        email,
        full_name,
        role,
        team_id,
        is_active,
        created_at
      `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Charger équipes pour les selects ET les noms
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color')
        .order('name');

      if (teamsError) throw teamsError;

      // Créer un map des équipes pour lookup rapide
      const teamsMap = Object.fromEntries(
        (teamsData || []).map(team => [team.id, team.name])
      );

      // Format des données avec jointure manuelle
      if (usersData) {
        const formattedUsers: User[] = usersData.map(user => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name || '',
          role: user.role,
          team_id: user.team_id,
          team_name: user.team_id ? teamsMap[user.team_id] || null : null,
          is_active: user.is_active,
          created_at: user.created_at,
        }));
        setUsers(formattedUsers);
      }

      if (teamsData) {
        setTeams(teamsData);
      }

    } catch (error: any) {
      console.error('Erreur chargement données:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Mise à jour optimiste + rollback en cas d'erreur
  const updateUser = async (userId: string, updates: Partial<Pick<User, 'role' | 'team_id' | 'is_active'>>) => {
    // 1. Sauvegarder état actuel pour rollback
    const originalUser = users.find(u => u.id === userId);
    if (!originalUser) {
      toast.error('Utilisateur non trouvé');
      return;
    }

    // 2. Mise à jour optimiste (UI instantanée)
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, ...updates }
          : user
      )
    );

    // 3. Notification immédiate
    const actionText =
      updates.role ? `Rôle changé vers ${updates.role}` :
        updates.team_id !== undefined ? 'Équipe modifiée' :
          updates.is_active !== undefined ? (updates.is_active ? 'Activé' : 'Désactivé') :
            'Modifié';

    toast.loading(`${actionText}...`, { id: `update-${userId}` });

    try {
      // 4. Appel API
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // 5. Succès
      toast.success(`${actionText} avec succès`, { id: `update-${userId}` });

      // Recharger les données pour être sûr
      setTimeout(() => loadData(), 500);

    } catch (error: any) {
      // 6. Rollback en cas d'erreur
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? originalUser : user
        )
      );

      console.error('Erreur mise à jour:', error);
      toast.error(`Erreur: ${error.message}`, { id: `update-${userId}` });
    }
  };

  return { users, teams, isLoading, loadData, updateUser };
}

export default function AdminUsersPage() {
  const { users, teams, isLoading, loadData, updateUser } = useAdminUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);

  // Form state
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'sapeur' as const,
    team_id: '',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Fonction de création utilisateur avec gestion d'erreur
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      toast.error('Tous les champs obligatoires doivent être remplis');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    const loadingToast = toast.loading('Création de l\'utilisateur...');

    try {
      // Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Mettre à jour le profil avec le rôle et l'équipe
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: newUser.role,
            team_id: newUser.team_id || null,
            full_name: newUser.full_name,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Erreur mise à jour profil:', profileError);
          toast.error('Utilisateur créé mais erreur profil');
        } else {
          toast.success('Utilisateur créé avec succès !');
        }
      }

      // Reset form et recharger
      setNewUser({
        email: '',
        full_name: '',
        role: 'sapeur',
        team_id: '',
        password: '',
      });
      setShowCreateForm(false);
      loadData();

    } catch (error: any) {
      console.error('Erreur création:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Gestion réinitialisation mot de passe
  const handleResetPassword = async (userId: string, userEmail: string) => {
    const loadingToast = toast.loading('Envoi email de réinitialisation...');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;

      toast.success('Email de réinitialisation envoyé');
      setShowResetModal(null);

    } catch (error: any) {
      console.error('Erreur reset password:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des utilisateurs...</p>
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
                <div className="text-2xl">👥</div>
                <h1 className="text-xl font-bold text-gray-900">Gestion Utilisateurs</h1>
              </div>

              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Nouvel Utilisateur
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">Tous les rôles</option>
                <option value="sapeur">Sapeurs</option>
                <option value="chef_equipe">Chefs d'équipe</option>
                <option value="tresorier">Trésoriers</option>
              </select>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {filteredUsers.length} utilisateur(s) • {users.filter(u => u.is_active).length} actif(s)
            </div>
          </div>

          {/* Table utilisateurs */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Équipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Créé le
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => updateUser(user.id, { role: e.target.value as any })}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="sapeur">Sapeur</option>
                          <option value="chef_equipe">Chef équipe</option>
                          <option value="tresorier">Trésorier</option>
                        </select>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.team_id || ''}
                          onChange={(e) => updateUser(user.id, { team_id: e.target.value || null })}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="">Aucune équipe</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                          className={`px-2 py-1 text-xs rounded-full ${user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setShowResetModal(user.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Reset MDP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal création utilisateur */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Créer un Nouvel Utilisateur
                </h3>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe temporaire
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      placeholder="Min. 6 caractères"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rôle
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="sapeur">Sapeur</option>
                      <option value="chef_equipe">Chef d'équipe</option>
                      <option value="tresorier">Trésorier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Équipe (optionnel)
                    </label>
                    <select
                      value={newUser.team_id}
                      onChange={(e) => setNewUser({ ...newUser, team_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Aucune équipe</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Créer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal confirmation reset password */}
          {showResetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Réinitialiser le mot de passe
                </h3>

                <p className="text-gray-600 mb-6">
                  Un email de réinitialisation sera envoyé à l'utilisateur.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetModal(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const user = users.find(u => u.id === showResetModal);
                      if (user) handleResetPassword(user.id, user.email);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}