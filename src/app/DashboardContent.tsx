"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { supabase } from '@/shared/lib/supabase';
import { Card } from '@/components/ui';
import { Calendar, DollarSign, Award, PartyPopper, Recycle, Sparkles, Settings, LogOut } from 'lucide-react';

// Types pour vos données (à ajuster si besoin)
interface UserStats {
  total_dons: number;
  montant_total: number;
  calendriers_distribues: number;
  rang_equipe: number;
}
interface Team {
  id?: string;
  name: string;
  total_calendriers: number;
  total_collecte: number;
  pourcentage_objectif: number;
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="mt-4 text-2xl font-semibold">{value}</div>
      </div>
    </Card>
  );
}

function NavCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full hover:shadow-lg transition-shadow p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-gray-500">{description}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function DashboardContent() {
  const { profile, signOut } = useAuthStore();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [teamRanking, setTeamRanking] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const { data: teams, error } = await supabase
          .from('v_teams_leaderboard')
          .select('*')
          .order('total_collecte', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Erreur fetching teams leaderboard:', error);
        }

        if (mounted && teams) {
          setTeamRanking(
            teams.map((t: unknown) => {
              const team = t as Record<string, unknown>;
              return {
                id: (team.id as string) ?? undefined,
                name: (team.name as string) ?? '—',
                total_calendriers: (team.total_calendriers_distribues as number) ?? 0,
                total_collecte: (team.total_collecte as number) ?? 0,
                pourcentage_objectif: (team.pourcentage_objectif as number) ?? 0,
              } as Team;
            })
          );
        }

        if (mounted && profile) {
          setUserStats({
            total_dons: 12,
            montant_total: 240,
            calendriers_distribues: 18,
            rang_equipe: 3,
          });
        }
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    if (profile) loadStats();
    return () => {
      mounted = false;
    };
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="text-center p-8 shadow-lg">
          <div className="text-6xl mb-4">🔥</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" />
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
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Amicale SP</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">{profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={() => signOut()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h2>
          <p className="text-gray-600">Vue d&apos;ensemble de vos activités et performance</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard title="Dons collectés" value={userStats?.total_dons ?? 0} icon={DollarSign} />
          <StatCard title="Montant total" value={`${userStats?.montant_total ?? 0}€`} icon={DollarSign} />
          <StatCard title="Calendriers distribués" value={userStats?.calendriers_distribues ?? 0} icon={Calendar} />
          <StatCard title="Rang de l'équipe" value={`#${userStats?.rang_equipe ?? 'N/A'}`} icon={Award} />
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Accès Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NavCard href="/tournee" title="Calendriers 2025" description="Gérez votre tournée, suivez vos dons et votre progression." icon={Calendar} />
            <NavCard href="/actualites" title="Actualités de l'Amicale" description="Consultez les dernières informations et événements." icon={PartyPopper} />
            <NavCard href="/petites-annonces" title="Petites Annonces" description="Achetez, vendez ou échangez du matériel entre collègues." icon={Recycle} />
            <NavCard href="/sports" title="Activités Sportives" description="Retrouvez le calendrier sportif et inscrivez-vous aux événements." icon={Sparkles} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Classement des Équipes</h2>
          <Card>
            <div className="p-4 overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-2">Équipe</th>
                    <th className="px-4 py-2">Calendriers</th>
                    <th className="px-4 py-2">Montant Collecté</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRanking.length > 0 ? (
                    teamRanking.map((team) => (
                      <tr key={team.name} className="border-t">
                        <td className="px-4 py-3">{team.name}</td>
                        <td className="px-4 py-3">{team.total_calendriers}</td>
                        <td className="px-4 py-3">{team.total_collecte}€</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-6">Le classement apparaîtra après les premiers dons.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
