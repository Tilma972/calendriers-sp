// src/app/admin/teams-new/page.tsx - Page Teams Refactorisée (Version simplifiée)
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { 
  AdminPage, 
  AdminPageHeader, 
  AdminContent, 
  AdminSection,
  AdminGrid,
  AdminStatCard,
  AdminCard
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';

interface Team {
  id: string;
  name: string;
  color: string;
  chef_id: string | null;
  chef_name: string | null;
  created_at: string;
}

export default function AdminTeamsPageNew() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      
      // Charger les équipes
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('id, name, color, chef_id, created_at')
        .order('name');

      if (error) throw error;

      // Simuler les noms des chefs (pour la démo)
      const teamsWithChefs = (teamsData || []).map(team => ({
        ...team,
        chef_name: team.chef_id ? `Chef ${team.name}` : null
      }));

      setTeams(teamsWithChefs);
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
    } finally {
      setIsLoading(false);
    }
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
        icon="🏢"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Équipes' }
        ]}
        actions={
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => console.log('Créer nouvelle équipe')}
          >
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
              icon="🏢"
              subtitle="Équipes créées"
            />
            <AdminStatCard
              title="Avec Chef"
              value={stats.withChef}
              icon="👨‍💼"
              subtitle="Équipes dirigées"
            />
            <AdminStatCard
              title="Sans Chef"
              value={stats.withoutChef}
              icon="⚠️"
              subtitle="À assigner"
            />
          </AdminGrid>
        </AdminSection>

        {/* Liste des équipes */}
        <AdminSection title="Équipes">
          <AdminGrid cols={2} gap="md">
            {teams.map((team) => (
              <AdminCard
                key={team.id}
                title={team.name}
                subtitle={team.chef_name ? `Chef: ${team.chef_name}` : 'Aucun chef assigné'}
                icon="🏢"
                headerAction={
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => console.log('Modifier équipe:', team.id)}
                  >
                    Modifier
                  </Button>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="text-sm text-gray-600">Couleur d'équipe</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Créée le:</span>
                    <span className="font-medium">
                      {new Date(team.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => console.log('Voir membres équipe:', team.id)}
                    >
                      Voir les membres
                    </Button>
                  </div>
                </div>
              </AdminCard>
            ))}
          </AdminGrid>
        </AdminSection>

        {/* Message si pas d'équipes */}
        {teams.length === 0 && (
          <AdminSection>
            <div className="text-center py-12">
              <div className="text-6xl mb-4 text-gray-300">🏢</div>
              <p className="text-gray-500">Aucune équipe configurée</p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => console.log('Créer première équipe')}
              >
                Créer la première équipe
              </Button>
            </div>
          </AdminSection>
        )}
      </AdminContent>
    </AdminPage>
  );
}