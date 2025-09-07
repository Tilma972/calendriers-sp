// src/app/admin/test-suite/page.tsx - Interface de test pour l'admin refactorisé
'use client';

import { useState } from 'react';
import { AdminGuard } from '@/shared/components/AdminGuard';
import { 
  AdminPage, 
  AdminPageHeader, 
  AdminContent, 
  AdminSection,
  AdminCard,
  AdminGrid
} from '@/components/ui/admin';
import { Button } from '@/components/ui/Button';
import { AdminTestSuite, TestResult, quickAdminTest } from '@/utils/admin-test-helper';

export default function AdminTestSuitePage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      const testSuite = new AdminTestSuite();
      const results = await testSuite.runAllTests();
      setTestResults(results);
      AdminTestSuite.displayResults(results);
    } catch (error) {
      console.error('Erreur lors des tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    try {
      const results = await quickAdminTest();
      setTestResults(results);
    } catch (error) {
      console.error('Erreur test rapide:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;
  const successRate = testResults.length > 0 ? Math.round((successCount / testResults.length) * 100) : 0;

  return (
    <AdminGuard>
      <AdminPage>
        <AdminPageHeader
          title="Suite de Tests Admin"
          subtitle="Validation automatique de l'interface administrateur"
          icon="🧪"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Tests' }
          ]}
          actions={
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={runQuickTest}
                disabled={isRunning}
              >
                Test Rapide
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={runTests}
                disabled={isRunning}
                isLoading={isRunning}
              >
                Lancer Tests Complets
              </Button>
            </div>
          }
        />

        <AdminContent>
          {/* Instructions */}
          <AdminSection>
            <AdminCard
              title="Instructions de Test"
              subtitle="Comment valider la refactorisation admin"
              icon="📋"
            >
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🧪 Test Rapide</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Valide les fonctionnalités essentielles en quelques secondes
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Connexion base de données</li>
                      <li>• Chargement des données</li>
                      <li>• Calculs statistiques</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🔍 Tests Complets</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Suite complète incluant performance et sécurité
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Tests de performance</li>
                      <li>• Vérifications sécurité</li>
                      <li>• Tests de permissions</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Conseil:</strong> Lancez d'abord le test rapide pour une validation de base, 
                    puis les tests complets avant la mise en production.
                  </p>
                </div>
              </div>
            </AdminCard>
          </AdminSection>

          {/* Résultats des tests */}
          {testResults.length > 0 && (
            <>
              {/* Résumé */}
              <AdminSection>
                <AdminGrid cols={4} gap="md">
                  <AdminCard className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{testResults.length}</div>
                    <div className="text-sm text-gray-600">Tests Exécutés</div>
                  </AdminCard>
                  
                  <AdminCard className="text-center">
                    <div className="text-3xl font-bold text-green-600">{successCount}</div>
                    <div className="text-sm text-gray-600">Réussis</div>
                  </AdminCard>
                  
                  <AdminCard className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
                    <div className="text-sm text-gray-600">Avertissements</div>
                  </AdminCard>
                  
                  <AdminCard className="text-center">
                    <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                    <div className="text-sm text-gray-600">Erreurs</div>
                  </AdminCard>
                </AdminGrid>
              </AdminSection>

              {/* Taux de réussite */}
              <AdminSection>
                <AdminCard
                  title={`Taux de Réussite: ${successRate}%`}
                  subtitle={
                    successRate === 100 ? "🎉 Parfait ! Interface prête pour la production" :
                    successRate >= 80 ? "✨ Très bien ! Quelques améliorations possibles" :
                    "🚨 Attention ! Corrections nécessaires avant production"
                  }
                  icon="📊"
                >
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-1000 ${
                        successRate === 100 ? 'bg-green-500' :
                        successRate >= 80 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                </AdminCard>
              </AdminSection>

              {/* Détails des tests */}
              <AdminSection title="Résultats Détaillés">
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="text-2xl">
                        {getStatusIcon(result.status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {result.test}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                            {result.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {result.message}
                        </p>
                        
                        {result.details && (
                          <details className="text-xs text-gray-500">
                            <summary className="cursor-pointer hover:text-gray-700">
                              Voir les détails
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminSection>
            </>
          )}

          {/* État de chargement */}
          {isRunning && (
            <AdminSection>
              <AdminCard>
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Exécution des tests en cours...</p>
                </div>
              </AdminCard>
            </AdminSection>
          )}

          {/* Message initial */}
          {testResults.length === 0 && !isRunning && (
            <AdminSection>
              <AdminCard>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🧪</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Prêt pour les Tests
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Lancez les tests pour valider la refactorisation de l'interface admin
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="secondary" onClick={runQuickTest}>
                      Test Rapide
                    </Button>
                    <Button variant="primary" onClick={runTests}>
                      Tests Complets
                    </Button>
                  </div>
                </div>
              </AdminCard>
            </AdminSection>
          )}
        </AdminContent>
      </AdminPage>
    </AdminGuard>
  );
}