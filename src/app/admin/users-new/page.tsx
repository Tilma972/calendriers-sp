// src/app/admin/users-new/page.tsx - Page Users Refactorisée
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
  AdminFormModal,
  AdminConfirmModal
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AdminTableFilters } from '@/components/ui/admin/AdminTable';
import { adminTheme, getRoleStyle } from '@/components/ui/admin/admin-theme';

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

// Hook personnalisé pour la gestion des utilisateurs admin (même logique que l'original)
function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Charger utilisateurs SANS jointure (même logique que l'original)
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

      // Charger équipes
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

  // Mise à jour utilisateur avec optimistic update (même logique que l'original)
  const updateUser = async (userId: string, updates: Partial<Pick<User, 'role' | 'team_id' | 'is_active'>>) => {
    const originalUser = users.find(u => u.id === userId);
    if (!originalUser) {
      toast.error('Utilisateur non trouvé');
      return;
    }

    // Mise à jour optimiste
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, ...updates }
          : user
      )
    );

    const actionText =
      updates.role ? `Rôle changé vers ${updates.role}` :
        updates.team_id !== undefined ? 'Équipe modifiée' :
          updates.is_active !== undefined ? (updates.is_active ? 'Activé' : 'Désactivé') :
            'Modifié';

    toast.loading(`${actionText}...`, { id: `update-${userId}` });

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${actionText} avec succès`, { id: `update-${userId}` });
      setTimeout(() => loadData(), 500);

    } catch (error: any) {
      // Rollback
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

export default function AdminUsersPageNew() {
  const { users, teams, isLoading, loadData, updateUser } = useAdminUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
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

  // Fonction de création utilisateur (même logique que l'original)
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      toast.error('Tous les champs obligatoires doivent être remplis');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    try {
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
    }
  };

  // Gestion réinitialisation mot de passe (même logique que l'original)
  const handleResetPassword = async (userId: string, userEmail: string) => {
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
    }
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesTeam = filterTeam === 'all' || user.team_id === filterTeam;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesTeam && matchesStatus;
  });

  // Stats pour les cartes
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    sapeurs: users.filter(u => u.role === 'sapeur').length,
    chefs: users.filter(u => u.role === 'chef_equipe').length,
    tresoriers: users.filter(u => u.role === 'tresorier').length
  };

  // Configuration des colonnes de table
  const tableColumns = [
    {
      key: 'user',
      title: 'Utilisateur',
      render: (value: any, row: User) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.full_name}
          </div>
          <div className="text-sm text-gray-700">{row.email}</div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Rôle',
      render: (value: string, row: User) => {
        const style = getRoleStyle(value as keyof typeof adminTheme.colors.roles);
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
              {style.icon} {value.replace('_', ' ')}
            </span>
            <select
              value={row.role}
              onChange={(e) => updateUser(row.id, { role: e.target.value as any })}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="sapeur">Sapeur</option>
              <option value="chef_equipe">Chef équipe</option>
              <option value="tresorier">Trésorier</option>
            </select>
          </div>
        );
      }
    },
    {
      key: 'team',
      title: 'Équipe',
      render: (value: any, row: User) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">
            {row.team_name || 'Aucune équipe'}
          </span>
          <select
            value={row.team_id || ''}
            onChange={(e) => updateUser(row.id, { team_id: e.target.value || null })}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Aucune équipe</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Statut',
      render: (value: any, row: User) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateUser(row.id, { is_active: !row.is_active });
          }}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            row.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {row.is_active ? 'Actif' : 'Inactif'}
        </button>
      )
    },
    {
      key: 'created_at',
      title: 'Créé le',
      render: (value: string) => (
        <span className="text-sm text-gray-700">
          {new Date(value).toLocaleDateString('fr-FR')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: User) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowResetModal(row.id);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        >
          Reset MDP
        </button>
      )
    }
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Gestion Utilisateurs"
        subtitle="Création et gestion des comptes utilisateur"
        icon="👥"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Utilisateurs' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            Nouvel Utilisateur
          </Button>
        }
      />

      <AdminContent>
        {/* Stats utilisateurs */}
        <AdminSection>
          <AdminGrid cols={5} gap="md">
            <AdminStatCard
              title="Total"
              value={stats.total}
              icon="👥"
              subtitle={`${stats.active} actifs`}
              onClick={() => setFilterStatus('all')}
            />
            <AdminStatCard
              title="Sapeurs"
              value={stats.sapeurs}
              icon="🧑‍🚒"
              subtitle="Collecteurs"
              onClick={() => setFilterRole('sapeur')}
            />
            <AdminStatCard
              title="Chefs d'équipe"
              value={stats.chefs}
              icon="👨‍💼"
              subtitle="Responsables"
              onClick={() => setFilterRole('chef_equipe')}
            />
            <AdminStatCard
              title="Trésoriers"
              value={stats.tresoriers}
              icon="💰"
              subtitle="Gestionnaires"
              onClick={() => setFilterRole('tresorier')}
            />
            <AdminStatCard
              title="Inactifs"
              value={stats.total - stats.active}
              icon="⏸️"
              subtitle="Désactivés"
              onClick={() => setFilterStatus('inactive')}
            />
          </AdminGrid>
        </AdminSection>

        {/* Filtres et recherche */}
        <AdminSection>
          <AdminTableFilters
            onReset={() => {
              setSearchTerm('');
              setFilterRole('all');
              setFilterTeam('all');
              setFilterStatus('all');
            }}
          >
            <div>
              <Input
                label="Recherche"
                placeholder="Nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">Tous les rôles</option>
                <option value="sapeur">Sapeurs</option>
                <option value="chef_equipe">Chefs d'équipe</option>
                <option value="tresorier">Trésoriers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Équipe</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </AdminTableFilters>
        </AdminSection>

        {/* Table des utilisateurs */}
        <AdminSection>
          <AdminTable
            columns={tableColumns}
            data={filteredUsers}
            isLoading={isLoading}
            emptyMessage="Aucun utilisateur trouvé avec ces critères"
            emptyIcon="👥"
            rowKey="id"
          />
        </AdminSection>
      </AdminContent>

      {/* Modal création utilisateur */}
      <AdminFormModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateUser}
        onCancel={() => setShowCreateForm(false)}
        title="Créer un Nouvel Utilisateur"
        subtitle="Configurer un nouveau compte utilisateur"
        submitText="Créer"
        cancelText="Annuler"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            value={newUser.full_name}
            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
            placeholder="Jean Dupont"
            required
          />

          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="jean.dupont@example.com"
            required
          />

          <Input
            label="Mot de passe temporaire"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Minimum 6 caractères"
            helperText="L'utilisateur pourra changer ce mot de passe à sa première connexion"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Aucune équipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </AdminFormModal>

      {/* Modal confirmation reset password */}
      {showResetModal && (() => {
        const user = users.find(u => u.id === showResetModal);
        if (!user) return null;

        return (
          <AdminConfirmModal
            isOpen={true}
            onClose={() => setShowResetModal(null)}
            onConfirm={() => handleResetPassword(user.id, user.email)}
            title="Réinitialiser le mot de passe"
            message={`Un email de réinitialisation sera envoyé à ${user.email}.`}
            type="info"
            confirmText="Envoyer"
            cancelText="Annuler"
          />
        );
      })()}
    </AdminPage>
  );
}