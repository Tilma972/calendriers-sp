// Page de test pour le design system admin - TEMPORAIRE
'use client';

import React, { useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { 
  AdminPage, 
  AdminPageHeader, 
  AdminContent, 
  AdminSection, 
  AdminGrid,
  AdminCard,
  AdminStatCard,
  AdminTable,
  AdminModal,
  AdminConfirmModal,
  AdminFormModal
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminTheme, createStatusBadge, getPaymentStyle } from '@/components/ui/admin/admin-theme';

const DesignTestPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  
  // Données de test pour la table
  const tableData = [
    { id: '1', name: 'Jean Dupont', email: 'jean@example.com', role: 'sapeur', status: 'pending' },
    { id: '2', name: 'Marie Martin', email: 'marie@example.com', role: 'chef_equipe', status: 'validated' },
    { id: '3', name: 'Pierre Durand', email: 'pierre@example.com', role: 'tresorier', status: 'rejected' }
  ];
  
  const tableColumns = [
    { key: 'name', title: 'Nom' },
    { key: 'email', title: 'Email' },
    { 
      key: 'role', 
      title: 'Rôle',
      render: (value: string) => {
        const style = adminTheme.colors.roles[value as keyof typeof adminTheme.colors.roles];
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${style?.bg} ${style?.text}`}>
            {style?.icon} {value.replace('_', ' ')}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      title: 'Statut',
      render: (value: string) => {
        const badge = createStatusBadge(value);
        return (
          <span className={badge.className}>
            {badge.icon} {badge.text}
          </span>
        );
      }
    }
  ];

  return (
    <AdminGuard>
      <AdminPage>
        <AdminPageHeader
          title="Test Design System"
          subtitle="Page de test temporaire pour valider les composants admin"
          icon="🧪"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Tests' },
            { label: 'Design System' }
          ]}
          actions={
            <div className="flex gap-3">
              <Button variant="secondary" size="sm">
                Actualiser
              </Button>
              <Button variant="primary" size="sm">
                Action Principale
              </Button>
            </div>
          }
        />

        <AdminContent>
          {/* Test des cartes de statistiques */}
          <AdminSection 
            title="Cartes de Statistiques" 
            subtitle="Test responsive des stats cards"
          >
            <AdminGrid cols={4} gap="md">
              <AdminStatCard
                title="Utilisateurs Total"
                value={156}
                icon="👥"
                subtitle="12 nouveaux ce mois"
                trend={{ value: 8.2, isPositive: true }}
              />
              <AdminStatCard
                title="Transactions"
                value="2,340"
                icon="💳"
                subtitle="En attente: 23"
                trend={{ value: -2.1, isPositive: false }}
              />
              <AdminStatCard
                title="Montant Collecté"
                value="45,678€"
                icon="💰"
                subtitle="Ce mois-ci"
              />
              <AdminStatCard
                title="Équipes Actives"
                value={12}
                icon="🏢"
                subtitle="Sur 15 équipes"
              />
            </AdminGrid>
          </AdminSection>

          {/* Test des cartes admin */}
          <AdminSection 
            title="Cartes Admin" 
            subtitle="Test des différents types de cartes"
          >
            <AdminGrid cols={2} gap="lg">
              <AdminCard
                title="Configuration"
                subtitle="Paramètres de l'application"
                icon="⚙️"
                headerAction={
                  <Button variant="outline" size="sm">
                    Modifier
                  </Button>
                }
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Mode maintenance</span>
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      Désactivé
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Notifications</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Activées
                    </span>
                  </div>
                </div>
              </AdminCard>

              <AdminCard
                title="Actions Rapides"
                subtitle="Raccourcis administrateur"
                icon="⚡"
                isLoading={false}
              >
                <div className="space-y-3">
                  <Button variant="primary" className="w-full justify-start">
                    📧 Envoyer newsletter
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    📊 Générer rapport
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    🔄 Synchroniser données
                  </Button>
                </div>
              </AdminCard>
            </AdminGrid>
          </AdminSection>

          {/* Test de la table */}
          <AdminSection 
            title="Table Admin" 
            subtitle="Test du composant table responsive"
          >
            <AdminTable
              columns={tableColumns}
              data={tableData}
              selectedRows={['1']}
              onSelectRow={(id, selected) => console.log('Select row:', id, selected)}
              onSelectAll={(selected) => console.log('Select all:', selected)}
              onRowClick={(row) => console.log('Row clicked:', row)}
            />
          </AdminSection>

          {/* Test des badges et états */}
          <AdminSection 
            title="États et Badges" 
            subtitle="Test des différents types de badges"
          >
            <AdminCard title="Types de Paiement">
              <div className="flex flex-wrap gap-3">
                {Object.entries(adminTheme.colors.payment).map(([method, style]) => (
                  <span key={method} className={`px-3 py-2 text-sm font-medium rounded-full ${style.bg} ${style.text}`}>
                    {style.icon} {method === 'especes' ? 'Espèces' : method}
                  </span>
                ))}
              </div>
            </AdminCard>

            <AdminCard title="Statuts de Transaction">
              <div className="flex flex-wrap gap-3">
                {['pending', 'validated', 'rejected', 'draft'].map((status) => {
                  const badge = createStatusBadge(status);
                  return (
                    <span key={status} className={badge.className}>
                      {badge.icon} {badge.text}
                    </span>
                  );
                })}
              </div>
            </AdminCard>
          </AdminSection>

          {/* Test des modales */}
          <AdminSection 
            title="Modales" 
            subtitle="Test des différents types de modales"
          >
            <AdminGrid cols={3}>
              <Button 
                variant="primary" 
                onClick={() => setShowModal(true)}
              >
                Modal Standard
              </Button>
              <Button 
                variant="danger" 
                onClick={() => setShowConfirmModal(true)}
              >
                Modal Confirmation
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowFormModal(true)}
              >
                Modal Formulaire
              </Button>
            </AdminGrid>
          </AdminSection>

          {/* Test responsive */}
          <AdminSection 
            title="Test Responsive" 
            subtitle="Éléments qui s'adaptent selon la taille d'écran"
          >
            <div className="bg-white rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Bloc {i}</span>
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
                <p><strong>Mobile (&lt; 640px):</strong> 1 colonne</p>
                <p><strong>Tablet (640px - 1024px):</strong> 2 colonnes</p>
                <p><strong>Desktop (&gt; 1024px):</strong> 4 colonnes</p>
              </div>
            </div>
          </AdminSection>
        </AdminContent>

        {/* Modales de test */}
        <AdminModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Modal Standard"
          subtitle="Exemple de modal avec contenu"
          size="md"
        >
          <div className="space-y-4">
            <p>Ceci est un exemple de modal standard avec du contenu.</p>
            <Input label="Champ de test" placeholder="Tapez quelque chose..." />
          </div>
        </AdminModal>

        <AdminConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={() => {
            console.log('Confirmé!');
            setShowConfirmModal(false);
          }}
          title="Confirmer l'action"
          message="Êtes-vous sûr de vouloir effectuer cette action ? Cette opération ne peut pas être annulée."
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
        />

        <AdminFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={() => {
            console.log('Formulaire soumis!');
            setShowFormModal(false);
          }}
          onCancel={() => setShowFormModal(false)}
          title="Nouveau Utilisateur"
          subtitle="Créer un compte utilisateur"
          submitText="Créer"
          cancelText="Annuler"
        >
          <div className="space-y-4">
            <Input label="Nom complet" placeholder="Jean Dupont" />
            <Input label="Email" type="email" placeholder="jean@example.com" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Téléphone" placeholder="+33 6 12 34 56 78" />
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Rôle
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500">
                  <option>Sapeur</option>
                  <option>Chef d'équipe</option>
                  <option>Trésorier</option>
                </select>
              </div>
            </div>
          </div>
        </AdminFormModal>
      </AdminPage>
    </AdminGuard>
  );
};

export default DesignTestPage;