// src/app/admin/settings/page.tsx - Paramètres Essentiels Simplifié
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface BasicSettings {
  id: number;
  global_calendars_target: number;
  default_team_target: number;
  max_calendars_per_transaction: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<BasicSettings>({
    id: 1,
    global_calendars_target: 5000,
    default_team_target: 250,
    max_calendars_per_transaction: 10,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('settings')
        .select('id, global_calendars_target, default_team_target, max_calendars_per_transaction')
        .single();

      if (error) {
        // Si la table est vide, créer l'enregistrement par défaut
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('settings')
            .insert([{
              id: 1,
              global_calendars_target: 5000,
              default_team_target: 250,
              max_calendars_per_transaction: 10,
            }])
            .select('id, global_calendars_target, default_team_target, max_calendars_per_transaction')
            .single();

          if (insertError) throw insertError;
          if (newSettings) setSettings(newSettings);
        } else {
          throw error;
        }
      } else if (data) {
        setSettings(data);
      }

    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      toast.loading('Sauvegarde...', { id: 'save-settings' });

      const { error } = await supabase
        .from('settings')
        .update({
          global_calendars_target: settings.global_calendars_target,
          default_team_target: settings.default_team_target,
          max_calendars_per_transaction: settings.max_calendars_per_transaction,
        })
        .eq('id', 1);

      if (error) throw error;

      toast.success('Paramètres sauvegardés !', { id: 'save-settings' });

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde', { id: 'save-settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">Configuration des paramètres essentiels de l'application</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span>Objectifs et Limites</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Objectif global calendriers
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={settings.global_calendars_target}
              onChange={(e) => setSettings({
                ...settings,
                global_calendars_target: parseInt(e.target.value) || 0
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="5000"
            />
            <p className="text-xs text-gray-600 mt-1">
              Objectif total de calendriers pour toutes les équipes
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Objectif par équipe
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={settings.default_team_target}
              onChange={(e) => setSettings({
                ...settings,
                default_team_target: parseInt(e.target.value) || 0
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="250"
            />
            <p className="text-xs text-gray-600 mt-1">
              Objectif par défaut pour chaque nouvelle équipe
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Maximum par transaction
            </label>
            <input
              type="number"
              min="1"
              max="50"
              step="1"
              value={settings.max_calendars_per_transaction}
              onChange={(e) => setSettings({
                ...settings,
                max_calendars_per_transaction: parseInt(e.target.value) || 0
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="10"
            />
            <p className="text-xs text-gray-600 mt-1">
              Nombre maximum de calendriers par don
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>💾 Sauvegarder</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Interface simplifiée</span>
        </h3>
        <p className="text-blue-800 text-sm">
          Cette interface a été simplifiée pour ne conserver que les paramètres essentiels. 
          Les configurations email complexes ont été supprimées pour simplifier la gestion.
        </p>
      </div>
    </div>
  );
}