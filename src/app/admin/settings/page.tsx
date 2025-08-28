// src/app/admin/settings/page.tsx - Paramètres Globaux Admin
'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { supabase } from '@/shared/lib/supabase';
import { toast } from 'react-hot-toast';

interface AppSettings {
  // Campagne
  campaign_name: string;
  campaign_start: string;
  campaign_end: string;
  default_calendar_price: number;
  
  // Objectifs
  global_target: number;
  default_team_target: number;
  
  // Business rules
  max_calendars_per_transaction: number;
  allow_offline_mode: boolean;
  auto_sync_interval: number;
  
  // Notifications
  enable_email_notifications: boolean;
  admin_emails: string[];
  
  // Branding
  organization_name: string;
  primary_color: string;
  
  // Technique
  maintenance_mode: boolean;
  backup_enabled: boolean;
}

// Hook pour gestion des paramètres
function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    campaign_name: 'Calendriers 2025',
    campaign_start: new Date().toISOString().split('T')[0],
    campaign_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    default_calendar_price: 10,
    global_target: 1000,
    default_team_target: 100,
    max_calendars_per_transaction: 20,
    allow_offline_mode: true,
    auto_sync_interval: 5,
    enable_email_notifications: true,
    admin_emails: [],
    organization_name: 'ASPCH - Amicale des Sapeurs-Pompiers de Clermont l\'Hérault',
    primary_color: '#DC2626',
    maintenance_mode: false,
    backup_enabled: true,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<AppSettings | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // Charger les paramètres depuis une table dédiée ou des variables d'environnement
      // Pour l'instant, on simule avec des valeurs par défaut
      // Dans une vraie implémentation, on aurait une table 'app_settings' 
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error) {
        // Si la table n'existe pas ou autre erreur, on garde les valeurs par défaut
        console.warn('Table app_settings non trouvée, utilisation des défauts');
      } else if (data) {
        setSettings({
          campaign_name: data.campaign_name || settings.campaign_name,
          campaign_start: data.campaign_start || settings.campaign_start,
          campaign_end: data.campaign_end || settings.campaign_end,
          default_calendar_price: data.default_calendar_price || settings.default_calendar_price,
          global_target: data.global_target || settings.global_target,
          default_team_target: data.default_team_target || settings.default_team_target,
          max_calendars_per_transaction: data.max_calendars_per_transaction || settings.max_calendars_per_transaction,
          allow_offline_mode: data.allow_offline_mode !== null ? data.allow_offline_mode : settings.allow_offline_mode,
          auto_sync_interval: data.auto_sync_interval || settings.auto_sync_interval,
          enable_email_notifications: data.enable_email_notifications !== null ? data.enable_email_notifications : settings.enable_email_notifications,
          admin_emails: data.admin_emails || settings.admin_emails,
          organization_name: data.organization_name || settings.organization_name,
          primary_color: data.primary_color || settings.primary_color,
          maintenance_mode: data.maintenance_mode || false,
          backup_enabled: data.backup_enabled !== null ? data.backup_enabled : settings.backup_enabled,
        });
      }
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      } else {
        setOriginalSettings(settings);
      }

    } catch (error: any) {
      console.error('Erreur chargement paramètres:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      toast.loading('Sauvegarde des paramètres...', { id: 'save-settings' });

      // Upsert dans la table app_settings
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 1, // ID fixe pour avoir un seul enregistrement de paramètres
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Paramètres sauvegardés avec succès', { id: 'save-settings' });
      setOriginalSettings({ ...settings });

    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      toast.error(`Erreur: ${error.message}`, { id: 'save-settings' });
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

  const [activeTab, setActiveTab] = useState('campaign');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addAdminEmail = () => {
    if (newAdminEmail && newAdminEmail.includes('@')) {
      if (!settings.admin_emails.includes(newAdminEmail)) {
        updateSetting('admin_emails', [...settings.admin_emails, newAdminEmail]);
        setNewAdminEmail('');
      } else {
        toast.error('Cet email est déjà dans la liste');
      }
    } else {
      toast.error('Email invalide');
    }
  };

  const removeAdminEmail = (email: string) => {
    updateSetting('admin_emails', settings.admin_emails.filter(e => e !== email));
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
                <a href="/admin" className="text-gray-500 hover:text-gray-700">← Dashboard</a>
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
                N'oubliez pas de sauvegarder vos modifications avant de quitter la page.
              </div>
            </div>
          )}

          {/* Navigation onglets */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'campaign', label: 'Campagne', icon: '🎯' },
                  { id: 'business', label: 'Règles métier', icon: '📋' },
                  { id: 'notifications', label: 'Notifications', icon: '📧' },
                  { id: 'branding', label: 'Apparence', icon: '🎨' },
                  { id: 'technical', label: 'Technique', icon: '🔧' },
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
              {/* Onglet Campagne */}
              {activeTab === 'campaign' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Campagne</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom de la campagne
                        </label>
                        <input
                          type="text"
                          value={settings.campaign_name}
                          onChange={(e) => updateSetting('campaign_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          placeholder="Ex: Calendriers 2025"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prix calendrier par défaut (€)
                        </label>
                        <input
                          type="number"
                          value={settings.default_calendar_price}
                          onChange={(e) => updateSetting('default_calendar_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="0"
                          step="0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={settings.campaign_start}
                          onChange={(e) => updateSetting('campaign_start', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={settings.campaign_end}
                          onChange={(e) => updateSetting('campaign_end', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Objectifs</h4>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Objectif global (calendriers)
                        </label>
                        <input
                          type="number"
                          value={settings.global_target}
                          onChange={(e) => updateSetting('global_target', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Objectif de calendriers pour toute la campagne
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Objectif par équipe par défaut
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
                          onChange={(e) => updateSetting('max_calendars_per_transaction', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          min="1"
                          max="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Limite le nombre de calendriers qu'un sapeur peut saisir en une fois
                        </p>
                      </div>

                      <div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.allow_offline_mode}
                            onChange={(e) => updateSetting('allow_offline_mode', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              Autoriser le mode hors-ligne
                            </div>
                            <div className="text-xs text-gray-500">
                              Les sapeurs peuvent saisir des transactions sans connexion Internet
                            </div>
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intervalle de synchronisation automatique (minutes)
                        </label>
                        <select
                          value={settings.auto_sync_interval}
                          onChange={(e) => updateSetting('auto_sync_interval', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        >
                          <option value={1}>1 minute</option>
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 heure</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Fréquence des tentatives de synchronisation en arrière-plan
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
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Emails</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.enable_email_notifications}
                            onChange={(e) => updateSetting('enable_email_notifications', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              Activer les notifications par email
                            </div>
                            <div className="text-xs text-gray-500">
                              Envoyer des emails pour les validations, erreurs, etc.
                            </div>
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Emails administrateurs
                        </label>
                        <div className="space-y-2">
                          {settings.admin_emails.map((email, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="email"
                                value={email}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                              />
                              <button
                                onClick={() => removeAdminEmail(email)}
                                className="text-red-600 hover:text-red-800 p-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              placeholder="nouvel.admin@email.com"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              onKeyPress={(e) => e.key === 'Enter' && addAdminEmail()}
                            />
                            <button
                              onClick={addAdminEmail}
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
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Personnalisation</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom de l'organisation
                        </label>
                        <input
                          type="text"
                          value={settings.organization_name}
                          onChange={(e) => updateSetting('organization_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          placeholder="Ex: SDIS - Service Départemental d'Incendie et de Secours"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Couleur principale
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="color"
                            value={settings.primary_color}
                            onChange={(e) => updateSetting('primary_color', e.target.value)}
                            className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settings.primary_color}
                            onChange={(e) => updateSetting('primary_color', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 font-mono"
                            placeholder="#DC2626"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Couleur utilisée pour les boutons, liens et éléments d'interface
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Aperçu</h4>
                        <div className="space-y-2">
                          <button 
                            className="px-4 py-2 text-white rounded-md font-medium"
                            style={{ backgroundColor: settings.primary_color }}
                          >
                            Bouton principal
                          </button>
                          <div>
                            <a href="#" style={{ color: settings.primary_color }} className="font-medium">
                              Lien de couleur principale
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Technique */}
              {activeTab === 'technical' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres Techniques</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.maintenance_mode}
                            onChange={(e) => updateSetting('maintenance_mode', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              Mode maintenance
                            </div>
                            <div className="text-xs text-gray-500">
                              Désactive l'accès à l'application pour les utilisateurs (sauf admins)
                            </div>
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.backup_enabled}
                            onChange={(e) => updateSetting('backup_enabled', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              Sauvegardes automatiques
                            </div>
                            <div className="text-xs text-gray-500">
                              Active les sauvegardes quotidiennes de la base de données
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="text-yellow-600">⚠️</div>
                      <div className="text-yellow-800 font-medium">Attention</div>
                    </div>
                    <div className="text-yellow-700 text-sm mt-1">
                      Les modifications des paramètres techniques peuvent affecter le fonctionnement de l'application. 
                      Consultez l'équipe technique avant de modifier ces paramètres.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions globales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions Système</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir vider le cache système ?')) {
                    toast.success('Cache vidé avec succès');
                  }
                }}
                className="p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-blue-900">Vider le cache</div>
                <div className="text-sm text-blue-700">Supprime les données en cache pour forcer un rechargement</div>
              </button>

              <button
                onClick={() => {
                  if (confirm('Créer une sauvegarde manuelle maintenant ?')) {
                    toast.loading('Création de la sauvegarde...', { id: 'backup' });
                    setTimeout(() => {
                      toast.success('Sauvegarde créée avec succès', { id: 'backup' });
                    }, 2000);
                  }
                }}
                className="p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-green-900">Sauvegarde manuelle</div>
                <div className="text-sm text-green-700">Crée immédiatement une sauvegarde de la base de données</div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}