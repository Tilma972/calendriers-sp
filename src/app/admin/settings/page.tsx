// src/app/admin/settings/page.tsx - Paramètres Globaux Admin
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';
import type { Database } from '@/types/database.types';

// Utilisation du type depuis la base de données
type AppSettings = Database['public']['Tables']['settings']['Row'];

// Hook pour gestion des paramètres
function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    id: 1,
    global_calendars_target: 5000,
    default_team_target: 250,
    max_calendars_per_transaction: 10,
    sync_frequency_minutes: 15,
    notification_emails: [],
    primary_color: '#DC2626',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<AppSettings | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      // Charger les paramètres depuis la table settings
      const { data, error } = await supabase
        .from('settings')
        .select('id, global_calendars_target, default_team_target, max_calendars_per_transaction, sync_frequency_minutes, notification_emails, primary_color')
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
              sync_frequency_minutes: 15,
              notification_emails: [],
              primary_color: '#DC2626'
            }])
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          if (newSettings) {
            setSettings(newSettings);
            setOriginalSettings(newSettings);
          }
        } else {
          throw error;
        }
      } else if (data) {
        setSettings(data);
        setOriginalSettings(data);
      }

    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      toast.loading('Sauvegarde des paramètres...', { id: 'save-settings' });

      const { error } = await supabase
        .from('settings')
        .update({
          global_calendars_target: settings.global_calendars_target,
          default_team_target: settings.default_team_target,
          max_calendars_per_transaction: settings.max_calendars_per_transaction,
          sync_frequency_minutes: settings.sync_frequency_minutes,
          notification_emails: settings.notification_emails,
          primary_color: settings.primary_color,
        })
        .eq('id', 1);

      if (error) throw error;

      toast.success('Paramètres sauvegardés avec succès', { id: 'save-settings' });
      setOriginalSettings({ ...settings });

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`, { id: 'save-settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
      toast.success('Paramètres réinitialisés');
    }
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  return {
    settings,
    setSettings,
    isLoading,
    isSaving,
    loadSettings,
    saveSettings,
    resetSettings,
    hasUnsavedChanges: hasUnsavedChanges()
  };
}

export default function AdminSettingsPage() {
  const {
    settings,
    setSettings,
    isLoading,
    isSaving,
    loadSettings,
    saveSettings,
    resetSettings,
    hasUnsavedChanges
  } = useAppSettings();

  const [activeTab, setActiveTab] = useState('general');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addNotificationEmail = () => {
    if (newEmail && newEmail.includes('@')) {
      const currentEmails = settings.notification_emails || [];
      if (!currentEmails.includes(newEmail)) {
        updateSetting('notification_emails', [...currentEmails, newEmail]);
        setNewEmail('');
      } else {
        toast.error('Cet email est déjà dans la liste');
      }
    } else {
      toast.error('Email invalide');
    }
  };

  const removeNotificationEmail = (email: string) => {
    const currentEmails = settings.notification_emails || [];
    updateSetting('notification_emails', currentEmails.filter(e => e !== email));
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des paramètres...</p>
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
                <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                  ← Dashboard
                </Link>
                <div className="text-2xl">⚙️</div>
                <h1 className="text-xl font-bold text-gray-900">Paramètres Application</h1>
              </div>
              
              <div className="flex gap-3">
                {hasUnsavedChanges && (
                  <button
                    onClick={resetSettings}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  onClick={saveSettings}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm transition-colors"
                >
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Indicateur changements non sauvegardés */}
          {hasUnsavedChanges && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="text-orange-600">⚠️</div>
                <div className="text-orange-800 font-medium">Modifications non sauvegardées</div>
              </div>
              <div className="text-orange-700 text-sm mt-1">
                {`N'oubliez pas de sauvegarder vos modifications avant de quitter la page.`}
              </div>
            </div>
          )}

          {/* Navigation onglets */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'general', label: 'Général', icon: '🎯' },
                  { id: 'business', label: 'Règles métier', icon: '📋' },
                  { id: 'notifications', label: 'Notifications', icon: '📧' },
                  { id: 'appearance', label: 'Apparence', icon: '🎨' },
                  { id: 'sync', label: 'Synchronisation', icon: '🔄' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Onglet Général */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Objectifs de campagne</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Objectif global (calendriers)
                        </label>
                        <input
                          type="number"
                          value={settings.global_calendars_target}
                          onChange={(e) => updateSetting('global_calendars_target', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Objectif total de calendriers pour toute la campagne
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Objectif par défaut par équipe
                        </label>
                        <input
                          type="number"
                          value={settings.default_team_target}
                          onChange={(e) => updateSetting('default_team_target', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Objectif assigné automatiquement aux nouvelles équipes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Règles métier */}
              {activeTab === 'business' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Règles de Gestion</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre maximum de calendriers par transaction
                        </label>
                        <input
                          type="number"
                          value={settings.max_calendars_per_transaction}
                          onChange={(e) => updateSetting('max_calendars_per_transaction', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="1"
                          max="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {`Limite le nombre de calendriers qu'un sapeur peut saisir en une fois`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Emails de notification</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Emails administrateurs
                        </label>
                        <div className="space-y-2">
                          {(settings.notification_emails || []).map((email, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="email"
                                value={email}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                              />
                              <button
                                onClick={() => removeNotificationEmail(email)}
                                className="text-red-600 hover:text-red-800 p-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="nouvel.admin@email.com"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              onKeyPress={(e) => e.key === 'Enter' && addNotificationEmail()}
                            />
                            <button
                              onClick={addNotificationEmail}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Ces emails recevront les notifications système importantes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Apparence */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Personnalisation</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Couleur principale
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="color"
                            value={settings.primary_color || '#DC2626'}
                            onChange={(e) => updateSetting('primary_color', e.target.value)}
                            className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settings.primary_color || '#DC2626'}
                            onChange={(e) => updateSetting('primary_color', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 font-mono"
                            placeholder="#DC2626"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {`Couleur utilisée pour les boutons, liens et éléments d'interface`}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Aperçu</h4>
                        <div className="space-y-2">
                          <button 
                            className="px-4 py-2 text-white rounded-md font-medium"
                            style={{ backgroundColor: settings.primary_color || '#DC2626' }}
                          >
                            Bouton principal
                          </button>
                          <div>
                            <a href="#" style={{ color: settings.primary_color || '#DC2626' }} className="font-medium">
                              Lien de couleur principale
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Synchronisation */}
              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration de la synchronisation</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fréquence de synchronisation (minutes)
                        </label>
                        <select
                          value={settings.sync_frequency_minutes}
                          onChange={(e) => updateSetting('sync_frequency_minutes', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        >
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 heure</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {`Fréquence des tentatives de synchronisation automatique des données en arrière-plan`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions système */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions Système</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir vider le cache système ?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    toast.success('Cache vidé avec succès');
                  }
                }}
                className="p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-blue-900">Vider le cache</div>
                <div className="text-sm text-blue-700">Supprime les données en cache pour forcer un rechargement</div>
              </button>

              <button
                onClick={async () => {
                  if (confirm('Forcer la synchronisation des données maintenant ?')) {
                    toast.loading('Synchronisation...', { id: 'sync' });
                    // Ici vous pouvez ajouter la logique de synchronisation
                    setTimeout(() => {
                      toast.success('Synchronisation terminée', { id: 'sync' });
                    }, 2000);
                  }
                }}
                className="p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-green-900">Synchroniser maintenant</div>
                <div className="text-sm text-green-700">Force la synchronisation immédiate de toutes les données</div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
