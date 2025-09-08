// src/app/admin/teams-new/page.tsx - CORRIGÉ avec la bonne table
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  AdminPage, 
  AdminPageHeader, 
  AdminContent, 
  AdminSection,
  AdminGrid,
  AdminStatCard,
  AdminCard,
  AdminModal,
  AdminFormModal,
  AdminConfirmModal
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Building2, 
  Users, 
  UserCheck, 
  AlertTriangle,
  Edit,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  color: string;
  chef_id: string | null;
  chef_name: string | null;
  calendars_target: number;
  created_at: string;
  nb_members?: number;
  total_collecte?: number;
  total_calendriers_distribues?: number;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: 'sapeur' | 'chef_equipe' | 'tresorier';
}

// Couleurs prédéfinies pour les équipes
const TEAM_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E'
];

export default function AdminTeamsPageNew() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // États des modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    chef_id: '',
    calendars_target: 1000,
    color: TEAM_COLORS[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // CORRECTION: Utiliser 'profiles' au lieu de 'user_profiles'
      const [teamsResult, usersResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, color, chef_id, calendars_target, created_at')
          .order('name'),
        supabase
          .from('profiles') // ✅ Table correcte
          .select('id, full_name, email, role')
          .in('role', ['sapeur', 'chef_equipe', 'tresorier'])
          .eq('is_active', true) // Seulement les utilisateurs actifs
      ]);

      if (teamsResult.error) {
        console.error('Erreur teams:', teamsResult.error);
        throw teamsResult.error;
      }
      
      if (usersResult.error) {
        console.error('Erreur users:', usersResult.error);
        throw usersResult.error;
      }

      const teamsData = teamsResult.data || [];
      const usersData = usersResult.data || [];

      console.log('Teams chargées:', teamsData.length);
      console.log('Users chargés:', usersData.length);

      // Enrichir les équipes avec les noms des chefs
      const chefsMap = new Map(
        usersData.map(u => [u.id, u.full_name || u.email])
      );

      const teamsWithChefs = teamsData.map(team => ({
        ...team,
        chef_name: team.chef_id ? chefsMap.get(team.chef_id) || null : null
      }));

      setTeams(teamsWithChefs);
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Le nom de l\'équipe est requis');
        return;
      }

      setIsSubmitting(true);

      const { error } = await supabase
        .from('teams')
        .insert({
          name: formData.name.trim(),
          chef_id: formData.chef_id || null,
          calendars_target: formData.calendars_target,
          color: formData.color
        });

      if (error) throw error;

      toast.success('Équipe créée avec succès');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur création équipe:', error);
      toast.error('Erreur lors de la création de l\'équipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeam = async () => {
    try {
      if (!showEditModal || !formData.name.trim()) return;

      setIsSubmitting(true);

      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name.trim(),
          chef_id: formData.chef_id || null,
          calendars_target: formData.calendars_target,
          color: formData.color
        })
        .eq('id', showEditModal);

      if (error) throw error;

      toast.success('Équipe modifiée avec succès');
      setShowEditModal(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur modification équipe:', error);
      toast.error('Erreur lors de la modification de l\'équipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      if (!showDeleteModal) return;

      setIsSubmitting(true);

      // Vérifier s'il y a des membres dans l'équipe
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('team_id', showDeleteModal)
        .limit(1);

      if (membersError) throw membersError;

      if (members && members.length > 0) {
        toast.error('Impossible de supprimer une équipe qui a des membres');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', showDeleteModal);

      if (error) throw error;

      toast.success('Équipe supprimée avec succès');
      setShowDeleteModal(null);
      loadData();
    } catch (error) {
      console.error('Erreur suppression équipe:', error);
      toast.error('Erreur lors de la suppression de l\'équipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      chef_id: '',
      calendars_target: 1000,
      color: TEAM_COLORS[0]
    });
  };

  const openEditModal = (team: Team) => {
    setFormData({
      name: team.name,
      chef_id: team.chef_id || '',
      calendars_target: team.calendars_target,
      color: team.color
    });
    setShowEditModal(team.id);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const navigateToMembers = (teamId: string) => {
    // Pour l'instant, rediriger vers la page équipes classique ou créer une route dédiée
    router.push(`/admin/teams?team=${teamId}`);
  };

  const stats = {
    total: teams.length,
    withChef: teams.filter(t => t.chef_id).length,
    withoutChef: teams.filter(t => !t.chef_id).length
  };

  if (isLoading) {
    return (
      <AdminPage>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement des équipes...</p>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Gestion Équipes"
        subtitle="Organisation et configuration des équipes"
        icon={<Building2 className="w-6 h-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Équipes' }
        ]}
        actions={
          <Button 
            variant="primary" 
            size="sm"
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Équipe
          </Button>
        }
      />

      <AdminContent>
        {/* Stats équipes */}
        <AdminSection>
          <AdminGrid cols={3} gap="md">
            <AdminStatCard
              title="Total Équipes"
              value={stats.total}
              icon={<Building2 className="w-5 h-5" />}
              subtitle="Équipes créées"
            />
            <AdminStatCard
              title="Avec Chef"
              value={stats.withChef}
              icon={<UserCheck className="w-5 h-5" />}
              subtitle="Équipes dirigées"
            />
            <AdminStatCard
              title="Sans Chef"
              value={stats.withoutChef}
              icon={<AlertTriangle className="w-5 h-5" />}
              subtitle="À assigner"
            />
          </AdminGrid>
        </AdminSection>

        {/* Liste des équipes */}
        <AdminSection title="Équipes">
          {teams.length > 0 ? (
            <AdminGrid cols={2} gap="md">
              {teams.map((team) => (
                <AdminCard
                  key={team.id}
                  title={team.name}
                  subtitle={team.chef_name ? `Chef: ${team.chef_name}` : 'Aucun chef assigné'}
                  icon={<Building2 className="w-5 h-5" />}
                  headerAction={
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditModal(team)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Modifier
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-sm text-gray-600">Couleur d'équipe</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Objectif calendriers:</span>
                      <span className="font-medium">{team.calendars_target?.toLocaleString() || 'Non défini'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Créée le:</span>
                      <span className="font-medium">
                        {new Date(team.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t space-y-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => navigateToMembers(team.id)}
                      >
                        <Users className="w-4 h-4" />
                        Voir les membres
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setShowDeleteModal(team.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </AdminGrid>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-300 mb-4">
                <Building2 className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-500 mb-4">Aucune équipe configurée</p>
              <Button 
                variant="primary" 
                onClick={openCreateModal}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer la première équipe
              </Button>
            </div>
          )}
        </AdminSection>

        {/* Modal création/modification équipe */}
        <AdminFormModal
          isOpen={showCreateModal || !!showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(null);
            resetForm();
          }}
          onSubmit={showEditModal ? handleEditTeam : handleCreateTeam}
          title={showEditModal ? 'Modifier l\'équipe' : 'Créer une nouvelle équipe'}
          submitText={showEditModal ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'équipe *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Équipe Alpha"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chef d'équipe (optionnel)
              </label>
              <select
                value={formData.chef_id}
                onChange={(e) => setFormData({ ...formData, chef_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Aucun chef</option>
                {users
                  .filter(u => u.role === 'chef_equipe' || u.role === 'tresorier')
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.role})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objectif calendriers
              </label>
              <Input
                type="number"
                value={formData.calendars_target}
                onChange={(e) => setFormData({ ...formData, calendars_target: parseInt(e.target.value) || 0 })}
                min="0"
                step="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur d'équipe
              </label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </AdminFormModal>

        {/* Modal confirmation suppression */}
        {showDeleteModal && (() => {
          const team = teams.find(t => t.id === showDeleteModal);
          if (!team) return null;

          return (
            <AdminConfirmModal
              isOpen={true}
              onClose={() => setShowDeleteModal(null)}
              onConfirm={handleDeleteTeam}
              title="Supprimer l'équipe"
              message={`Êtes-vous sûr de vouloir supprimer l'équipe "${team.name}" ? Cette action est irréversible.`}
              type="danger"
              confirmText="Supprimer"
              cancelText="Annuler"
              isSubmitting={isSubmitting}
            />
          );
        })()}
      </AdminContent>
    </AdminPage>
  );
}