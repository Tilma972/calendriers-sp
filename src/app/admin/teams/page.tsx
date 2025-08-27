// src/app/admin/teams/page.tsx - Gestion Équipes Admin
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface Team {
  id: string;
  name: string;
  chef_id: string | null;
  chef_name: string | null;
  calendars_target: number;
  color: string;
  created_at: string;
  // Stats depuis vue leaderboard
  nb_members?: number;
  total_collecte?: number;
  total_calendriers_distribues?: number;
  pourcentage_objectif?: number;
  rang_global?: number;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: 'sapeur' | 'chef_equipe' | 'tresorier';
}

interface TeamStats {
  nb_members: number;
  nb_tournees_actives: number;
  total_collecte: number;
  total_calendriers: number;
  pourcentage_objectif: number;
}

// Couleurs prédéfinies pour les équipes
const TEAM_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E'
];

// Hook personnalisé pour la gestion des équipes
function useAdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Charger équipes avec stats et chef
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          chef_id,
          calendars_target,
          color,
          created_at
        `)
        .order('name');

      if (teamsError) throw teamsError;

      // Charger séparément les noms des chefs pour éviter les problèmes de jointure
      const chefIds = (Array.isArray(teamsData)
        ? teamsData.map(t => t.chef_id).filter((id): id is string => typeof id === 'string')
        : []);
      let chefsMap: Record<string, string> = {};
      
      if (chefIds.length > 0) {
        const { data: chefsData, error: chefsError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', chefIds);

        if (!chefsError && Array.isArray(chefsData)) {
          chefsMap = Object.fromEntries(
            chefsData.map(chef => [chef.id, chef.full_name || 'Sans nom'])
          );
        }
      }

      // Charger stats depuis vue leaderboard
      const { data: statsData, error: statsError } = await supabase
        .from('v_teams_leaderboard')
        .select('*');

      if (statsError) console.warn('Erreur stats équipes:', statsError);

      // Charger utilisateurs pour les selects de chef
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['chef_equipe', 'tresorier'])
        .eq('is_active', true)
        .order('full_name');

      if (usersError) throw usersError;

      // Fusionner données équipes + stats
      if (teamsData) {
        const formattedTeams: Team[] = teamsData.map(team => {
          const stats = statsData?.find(s => s.id === team.id);
          return {
            id: team.id,
            name: team.name,
            chef_id: team.chef_id,
            chef_name: team.chef_id ? chefsMap[team.chef_id] || null : null,
            calendars_target: team.calendars_target,
            color: team.color,
            created_at: team.created_at,
            total_collecte: stats?.total_collecte || 0,
            total_calendriers_distribues: stats?.total_calendriers_distribues || 0,
            pourcentage_objectif: stats?.pourcentage_objectif || 0,
            rang_global: stats?.rang_global || 0,
          };
        });
        setTeams(formattedTeams);
      }

      if (usersData) {
        setUsers(usersData);
      }

    } catch (error: any) {
      console.error('Erreur chargement équipes:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Mise à jour optimiste + rollback
  const updateTeam = async (teamId: string, updates: Partial<Pick<Team, 'name' | 'chef_id' | 'calendars_target' | 'color'>>) => {
    const originalTeam = teams.find(t => t.id === teamId);
    if (!originalTeam) {
      toast.error('Équipe non trouvée');
      return;
    }

    // Mise à jour optimiste
    setTeams(prev => 
      prev.map(team => 
        team.id === teamId 
          ? { 
              ...team, 
              ...updates,
              // Si changement de chef, mettre à jour le nom
              chef_name: updates.chef_id ? 
                users.find(u => u.id === updates.chef_id)?.full_name || team.chef_name
                : updates.chef_id === null ? null : team.chef_name
            }
          : team
      )
    );

    const actionText = 
      updates.name ? `Équipe renommée` :
      updates.chef_id !== undefined ? 'Chef modifié' :
      updates.calendars_target ? 'Objectif modifié' :
      updates.color ? 'Couleur modifiée' :
      'Équipe modifiée';
    
    toast.loading(`${actionText}...`, { id: `update-${teamId}` });

    try {
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId);

      if (error) throw error;

      toast.success(`${actionText} avec succès`, { id: `update-${teamId}` });
      
      // Recharger pour synchroniser
      setTimeout(() => loadData(), 500);

    } catch (error: any) {
      // Rollback
      setTeams(prev => 
        prev.map(team => 
          team.id === teamId ? originalTeam : team
        )
      );
      
      console.error('Erreur mise à jour équipe:', error);
      toast.error(`Erreur: ${error.message}`, { id: `update-${teamId}` });
    }
  };

  return { teams, users, isLoading, loadData, updateTeam };
}

export default function AdminTeamsPage() {
  const { teams, users, isLoading, loadData, updateTeam } = useAdminTeams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // Form state pour nouvelle équipe
  const [newTeam, setNewTeam] = useState({
    name: '',
    chef_id: '',
    calendars_target: 100,
    color: TEAM_COLORS[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  // Création d'équipe
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTeam.name.trim()) {
      toast.error('Le nom de l\'équipe est obligatoire');
      return;
    }

    const loadingToast = toast.loading('Création de l\'équipe...');

    try {
      const { error } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name.trim(),
          chef_id: newTeam.chef_id || null,
          calendars_target: newTeam.calendars_target,
          color: newTeam.color,
        });

      if (error) throw error;

      toast.success('Équipe créée avec succès !');
      
      // Reset form
      setNewTeam({
        name: '',
        chef_id: '',
        calendars_target: 100,
        color: TEAM_COLORS[0],
      });
      setShowCreateForm(false);
      loadData();

    } catch (error: any) {
      console.error('Erreur création équipe:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Suppression d'équipe
  const handleDeleteTeam = async (teamId: string) => {
    const loadingToast = toast.loading('Suppression de l\'équipe...');
    
    try {
      // Vérifier qu'il n'y a pas de membres assignés
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('team_id', teamId)
        .limit(1);

      if (membersError) throw membersError;

      if (members && members.length > 0) {
        toast.error('Impossible de supprimer une équipe qui a des membres assignés');
        return;
      }

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      
      toast.success('Équipe supprimée avec succès');
      setShowDeleteModal(null);
      loadData();
      
    } catch (error: any) {
      console.error('Erreur suppression équipe:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Filtrage des équipes
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.chef_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des équipes...</p>
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
                <div className="text-2xl">🏆</div>
                <h1 className="text-xl font-bold text-gray-900">Gestion Équipes</h1>
              </div>
              
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Nouvelle Équipe
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
              <div className="text-sm text-gray-600">Équipes totales</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {teams.filter(t => t.chef_id).length}
              </div>
              <div className="text-sm text-gray-600">Avec chef assigné</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {teams.reduce((sum, t) => sum + (t.total_collecte || 0), 0).toFixed(0)}€
              </div>
              <div className="text-sm text-gray-600">Collecte totale</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {teams.reduce((sum, t) => sum + t.calendars_target, 0)}
              </div>
              <div className="text-sm text-gray-600">Objectif global</div>
            </div>
          </div>

          {/* Recherche */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <input
              type="text"
              placeholder="Rechercher par nom d'équipe ou chef..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
            <div className="mt-2 text-sm text-gray-600">
              {filteredTeams.length} équipe(s)
            </div>
          </div>

          {/* Grille des équipes */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div key={team.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header équipe avec couleur */}
                <div 
                  className="h-2" 
                  style={{ backgroundColor: team.color }}
                />
                
                <div className="p-6">
                  {/* Nom et rang */}
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                      onBlur={(e) => {
                        if (e.target.value.trim() === '') {
                          e.target.value = team.name;
                        }
                      }}
                      className="text-lg font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-red-500 focus:outline-none px-1 -ml-1"
                    />
                    {team.rang_global ? (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        #{team.rang_global}
                      </span>
                    ) : null}
                  </div>

                  {/* Chef d'équipe */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Chef d'équipe
                    </label>
                    <select
                      value={team.chef_id || ''}
                      onChange={(e) => updateTeam(team.id, { chef_id: e.target.value || null })}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Aucun chef assigné</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Objectif calendriers */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Objectif calendriers
                    </label>
                    <input
                      type="number"
                      value={team.calendars_target}
                      onChange={(e) => updateTeam(team.id, { calendars_target: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
                      min="0"
                      step="10"
                    />
                  </div>

                  {/* Couleur */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Couleur d'équipe
                    </label>
                    <div className="grid grid-cols-6 gap-1">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updateTeam(team.id, { color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            team.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stats performance */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {team.total_collecte?.toFixed(0) || 0}€
                      </div>
                      <div className="text-xs text-gray-500">Collecté</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {team.total_calendriers_distribues || 0}
                      </div>
                      <div className="text-xs text-gray-500">Calendriers</div>
                    </div>
                  </div>

                  {/* Progression objectif */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progression</span>
                      <span>{team.pourcentage_objectif?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(team.pourcentage_objectif || 0, 100)}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-xs text-gray-500">
                      Créée le {new Date(team.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setShowDeleteModal(team.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message si aucune équipe */}
          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏆</div>
              <p className="text-gray-500">Aucune équipe trouvée</p>
            </div>
          )}

          {/* Modal création équipe */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Créer une Nouvelle Équipe
                </h3>
                
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'équipe *
                    </label>
                    <input
                      type="text"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      placeholder="Ex: Équipe Alpha"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chef d'équipe (optionnel)
                    </label>
                    <select
                      value={newTeam.chef_id}
                      onChange={(e) => setNewTeam({ ...newTeam, chef_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Aucun chef pour l'instant</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objectif calendriers
                    </label>
                    <input
                      type="number"
                      value={newTeam.calendars_target}
                      onChange={(e) => setNewTeam({ ...newTeam, calendars_target: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      min="0"
                      step="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couleur de l'équipe
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTeam({ ...newTeam, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newTeam.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
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

          {/* Modal suppression équipe */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Supprimer l'équipe
                </h3>
                
                <p className="text-gray-600 mb-6">
                  Attention : Cette action est irréversible. L'équipe et toutes ses données associées seront supprimées.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(showDeleteModal)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Supprimer
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