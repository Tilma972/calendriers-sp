// src/app/page.tsx - Dashboard Principal avec Menu
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { supabase } from '@/shared/lib/supabase';

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
  const { user, profile, signOut } = useAuthStore();
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
        <div className="text-center">
          <div className="text-6xl mb-4">🔥</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec profil */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔥</div>
              <h1 className="text-xl font-bold text-gray-900">Calendriers SP</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Info utilisateur */}
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">
                  {profile?.full_name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {profile?.role?.replace('_', ' ')}
                </div>
              </div>

              {/* Bouton déconnexion */}
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenue */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bonjour {profile?.full_name?.split(' ')[0]} ! 👋
          </h2>
          <p className="text-gray-600">
            Gérez vos activités d'amicale depuis votre tableau de bord
          </p>
        </div>

        {/* Stats rapides utilisateur */}
        {userStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">{userStats.total_dons}</div>
              <div className="text-sm text-gray-600">Dons collectés</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{userStats.montant_total}€</div>
              <div className="text-sm text-gray-600">Montant total</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{userStats.calendriers_distribues}</div>
              <div className="text-sm text-gray-600">Calendriers</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">#{userStats.rang_equipe}</div>
              <div className="text-sm text-gray-600">Rang équipe</div>
            </div>
          </div>
        )}

        {/* Menu principal - Modules */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Module Calendriers - ACTIF */}
          <a
            href="/calendriers"
            className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">Calendriers 2025</h3>
            <p className="text-red-100 text-sm mb-4">
              Gérer vos tournées et saisir les dons
            </p>
            <div className="flex items-center justify-between">
              <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                Campagne active
              </span>
              <div className="text-2xl">→</div>
            </div>
          </a>

          {/* Module Actualités - BIENTÔT */}
          <div className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-xl p-6 opacity-60 cursor-not-allowed">
            <div className="text-4xl mb-4">📢</div>
            <h3 className="text-xl font-bold mb-2">Actualités</h3>
            <p className="text-blue-100 text-sm mb-4">
              Informations et événements de l'amicale
            </p>
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
              Bientôt disponible
            </span>
          </div>

          {/* Module Sport - BIENTÔT */}
          <div className="bg-gradient-to-br from-green-400 to-green-500 text-white rounded-xl p-6 opacity-60 cursor-not-allowed">
            <div className="text-4xl mb-4">🏃</div>
            <h3 className="text-xl font-bold mb-2">Activités Sportives</h3>
            <p className="text-green-100 text-sm mb-4">
              Inscriptions et calendrier sportif
            </p>
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
              Bientôt disponible
            </span>
          </div>

          {/* Module Annonces - BIENTÔT */}
          <div className="bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-xl p-6 opacity-60 cursor-not-allowed">
            <div className="text-4xl mb-4">🛍️</div>
            <h3 className="text-xl font-bold mb-2">Petites Annonces</h3>
            <p className="text-purple-100 text-sm mb-4">
              Acheter, vendre entre collègues
            </p>
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
              Bientôt disponible
            </span>
          </div>
        </div>

        {/* Classement des équipes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            Classement des Équipes
          </h3>

          <div className="space-y-4">
            {teamStats.map((team, index) => (
              <div 
                key={team.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-400">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-600">
                      {team.total_calendriers} calendriers distribués
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">
                    {team.total_collecte?.toLocaleString() || '0'}€
                  </div>
                  <div className="text-sm text-gray-500">
                    {team.pourcentage_objectif?.toFixed(1) || '0'}% objectif
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teamStats.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📊</div>
              <p>Les statistiques s'afficheront après les premiers dons</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}