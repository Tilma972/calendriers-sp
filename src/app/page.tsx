// src/app/page.tsx - Dashboard Principal avec Menu
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { supabase } from '@/shared/lib/supabase';
import { Button, Card, CardHeader, CardBody, Badge } from '@/components/ui';
import { 
  Calendar, 
  Settings, 
  LogOut, 
  Target,
  TrendingUp,
  Trophy,
  Activity,
  Bell,
  Users,
  ShoppingBag
} from 'lucide-react';

// Types pour les stats
interface TeamStats {
  id: string;
  name: string;
  color: string;
  total_collecte: number;
  total_calendriers: number;
  pourcentage_objectif: number;
  rang_global: number;
}

interface UserStats {
  total_dons: number;
  montant_total: number;
  calendriers_distribues: number;
  rang_equipe: number;
}

export default function HomePage() {
  const { profile, signOut } = useAuthStore();
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les statistiques
  useEffect(() => {
    async function loadStats() {
      try {
        // Charger les stats des équipes
        const { data: teams } = await supabase
          .from('v_teams_leaderboard')
          .select('*')
          .order('total_collecte', { ascending: false })
          .limit(5);

        if (teams) {
          setTeamStats(
            teams.map((team) => ({
              id: team.id ?? '',
              name: team.name ?? '',
              color: team.color ?? '#cccccc',
              total_collecte: team.total_collecte ?? 0,
              total_calendriers: team.total_calendriers_distribues ?? 0,
              pourcentage_objectif: team.pourcentage_objectif ?? 0,
              rang_global: team.rang_global ?? 0,
            }))
          );
        }

        // Stats utilisateur (simulées pour l'instant)
        if (profile) {
          setUserStats({
            total_dons: 12,
            montant_total: 240,
            calendriers_distribues: 18,
            rang_equipe: 3
          });
        }

      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile) {
      loadStats();
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="text-center p-8 shadow-lg">
          <div className="text-6xl mb-4">🔥</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header professionnel */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et titre */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Amicale SP
                </h1>
              </div>
            </div>

            {/* Utilisateur et actions */}
            <div className="flex items-center space-x-4">
              {/* Profile info */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {profile?.role?.replace('_', ' ')}
                  </p>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => signOut()}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Tableau de bord
          </h2>
          <p className="text-gray-600">
            Vue d'ensemble de vos activités et performance
          </p>
        </div>

        {/* Stats personnelles */}
        {userStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dons collectés</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.total_dons}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Montant total</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.montant_total}€</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Calendriers</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.calendriers_distribues}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Trophy className="w-8 h-8 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rang équipe</p>
                  <p className="text-2xl font-bold text-gray-900">#{userStats.rang_equipe}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Module Calendriers - ACTIF */}
          <a
            href="/calendriers"
            className="relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
          >
            {/* Gradient header */}
            <div className="h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="success" size="sm">
                    Actif
                  </Badge>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Calendriers 2025
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Gestion des tournées et collecte des dons
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Campagne active
                </span>
                <div className="text-gray-400">→</div>
              </div>
            </div>
          </a>

          {/* Module Actualités - BIENTÔT */}
          <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 opacity-60 cursor-not-allowed">
            {/* Gradient header */}
            <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-700"></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="secondary" size="sm">
                    Bientôt
                  </Badge>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Actualités
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Informations et événements de l&apos;amicale
              </p>
            </div>
          </div>

          {/* Module Sport - BIENTÔT */}
          <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 opacity-60 cursor-not-allowed">
            {/* Gradient header */}
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-700"></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="secondary" size="sm">
                    Bientôt
                  </Badge>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Activités Sportives
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Inscriptions et calendrier sportif
              </p>
            </div>
          </div>

          {/* Module Annonces - BIENTÔT */}
          <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 opacity-60 cursor-not-allowed">
            {/* Gradient header */}
            <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-700"></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="secondary" size="sm">
                    Bientôt
                  </Badge>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Petites Annonces
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Acheter, vendre entre collègues
              </p>
            </div>
          </div>
        </div>

        {/* Classement des équipes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              Classement des équipes
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {teamStats.map((team, index) => (
              <div key={team.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Rang */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-700">
                        {index + 1}
                      </span>
                    </div>

                    {/* Info équipe */}
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {team.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {team.total_calendriers} calendriers distribués
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {team.total_collecte?.toLocaleString() || '0'}€
                    </p>
                    <p className="text-xs text-gray-500">
                      {team.pourcentage_objectif?.toFixed(1) || '0'}% de l'objectif
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: team.color,
                        width: `${Math.min(team.pourcentage_objectif || 0, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teamStats.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Les statistiques apparaîtront après les premiers dons
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}