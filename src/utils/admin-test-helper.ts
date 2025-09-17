// admin-test-helper.ts - Utilitaires pour tester l'interface admin refactorisée
import { supabase } from '@/shared/lib/supabase';

export interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: unknown;
}

// Small local row types to avoid broad `any` usage in tests
interface ProfileRow {
  id?: string;
  email?: string;
  role?: string;
  is_active?: boolean | null;
}

interface TransactionRow {
  id?: string;
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
}

interface TeamRow {
  id?: string;
  name?: string | null;
  color?: string | null;
  chef_id?: string | null;
}

function extractErrorMessage(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const maybe = err as Record<string, unknown>;
    if (typeof maybe.message === 'string') return maybe.message;
    if (typeof maybe.error === 'string') return maybe.error;
  }
  return String(err);
}

export class AdminTestSuite {
  private results: TestResult[] = [];

  // Test de connectivité base de données
  async testDatabaseConnection(): Promise<TestResult> {
    try {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);

      if (error) {
        return {
          test: 'Database Connection',
          status: 'error',
          message: `Erreur connexion DB: ${extractErrorMessage(error)}`,
          details: error
        };
      }

      return {
        test: 'Database Connection',
        status: 'success',
        message: `Connexion base de données OK (${data?.length || 0} row(s))`
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        test: 'Database Connection',
        status: 'error',
        message: `Erreur critique DB: ${message}`,
        details: error
      };
    }
  }

  // Test de chargement des données admin
  async testAdminDataLoad(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    try {
      // Test chargement utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, role, is_active')
        .limit(5);

      tests.push({
        test: 'Load Users Data',
        status: usersError ? 'error' : 'success',
        message: usersError ? `Erreur users: ${extractErrorMessage(usersError)}` : `${users?.length || 0} utilisateurs chargés`,
        details: usersError || { count: users?.length }
      });

      // Test chargement transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, amount, status, created_at')
        .limit(5);

      tests.push({
        test: 'Load Transactions Data',
        status: transactionsError ? 'error' : 'success',
        message: transactionsError ? `Erreur transactions: ${extractErrorMessage(transactionsError)}` : `${transactions?.length || 0} transactions chargées`,
        details: transactionsError || { count: transactions?.length }
      });

      // Test chargement équipes
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color, chef_id')
        .limit(5);

      tests.push({
        test: 'Load Teams Data',
        status: teamsError ? 'error' : 'success',
        message: teamsError ? `Erreur teams: ${extractErrorMessage(teamsError)}` : `${teams?.length || 0} équipes chargées`,
        details: teamsError || { count: teams?.length }
      });

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      tests.push({
        test: 'Admin Data Load',
        status: 'error',
        message: `Erreur globale: ${message}`,
        details: error
      });
    }

    return tests;
  }

  // Test des statistiques dashboard
  async testDashboardStats(): Promise<TestResult> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Statistiques de base (même logique que le dashboard)
      const [usersResult, transactionsResult, teamsResult] = await Promise.all([
        supabase.from('profiles').select('id, role, is_active'),
        supabase.from('transactions').select('id, amount, status, created_at').gte('created_at', today.toISOString()),
        supabase.from('teams').select('id, chef_id')
      ]);

      const usersData = (usersResult.data ?? []) as ProfileRow[];
      const transactionsData = (transactionsResult.data ?? []) as TransactionRow[];
      const teamsData = (teamsResult.data ?? []) as TeamRow[];

      const stats = {
        users_total: usersData.length || 0,
        users_active: usersData.filter((u: ProfileRow) => Boolean(u?.is_active)).length || 0,
        transactions_today: transactionsData.length || 0,
        teams_total: teamsData.length || 0,
        teams_with_chef: teamsData.filter((t: TeamRow) => Boolean(t?.chef_id)).length || 0
      };

      return {
        test: 'Dashboard Statistics',
        status: 'success',
        message: `Stats calculées: ${stats.users_total} users, ${stats.transactions_today} transactions aujourd'hui`,
        details: stats
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        test: 'Dashboard Statistics',
        status: 'error',
        message: `Erreur calcul stats: ${message}`,
        details: error
      };
    }
  }

  // Test de performance (temps de réponse)
  async testPerformance(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Chargement rapide users
    const startUsers = Date.now();
    try {
      await supabase.from('profiles').select('id').limit(100);
      const userLoadTime = Date.now() - startUsers;
      
      tests.push({
        test: 'Users Load Performance',
        status: userLoadTime < 1000 ? 'success' : userLoadTime < 2000 ? 'warning' : 'error',
        message: `Temps de chargement: ${userLoadTime}ms`,
        details: { loadTime: userLoadTime }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      tests.push({
        test: 'Users Load Performance',
        status: 'error',
        message: `Erreur perf users: ${message}`,
        details: error
      });
    }

    // Test 2: Chargement rapide transactions
    const startTransactions = Date.now();
    try {
      await supabase.from('transactions').select('id').limit(100);
      const transactionLoadTime = Date.now() - startTransactions;
      
      tests.push({
        test: 'Transactions Load Performance',
        status: transactionLoadTime < 1000 ? 'success' : transactionLoadTime < 2000 ? 'warning' : 'error',
        message: `Temps de chargement: ${transactionLoadTime}ms`,
        details: { loadTime: transactionLoadTime }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      tests.push({
        test: 'Transactions Load Performance',
        status: 'error',
        message: `Erreur perf transactions: ${message}`,
        details: error
      });
    }

    return tests;
  }

  // Test de sécurité (permissions)
  async testSecurityPermissions(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    try {
      // Vérifier que les tables admin sont accessibles
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      tests.push({
        test: 'Admin Table Access',
        status: profilesError ? 'error' : 'success',
        message: profilesError ? `Accès refusé profiles: ${extractErrorMessage(profilesError)}` : 'Accès tables admin OK',
        details: profilesError
      });

      // Test session utilisateur
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      tests.push({
        test: 'User Session',
        status: sessionError ? 'error' : sessionData.session ? 'success' : 'warning',
        message: sessionError ? `Erreur session: ${extractErrorMessage(sessionError)}` : sessionData.session ? 'Session active' : 'Aucune session active',
        details: { 
          hasSession: !!sessionData.session,
          userId: sessionData.session?.user?.id
        }
      });

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      tests.push({
        test: 'Security Permissions',
        status: 'error',
        message: `Erreur sécurité: ${message}`,
        details: error
      });
    }

    return tests;
  }

  // Exécuter tous les tests
  async runAllTests(): Promise<TestResult[]> {
    const allResults: TestResult[] = [];

    console.log('🧪 Démarrage des tests admin...');

    // Test 1: Connexion DB
    const dbTest = await this.testDatabaseConnection();
    allResults.push(dbTest);

    // Test 2: Chargement données
    const dataTests = await this.testAdminDataLoad();
    allResults.push(...dataTests);

    // Test 3: Statistiques dashboard
    const statsTest = await this.testDashboardStats();
    allResults.push(statsTest);

    // Test 4: Performance
    const perfTests = await this.testPerformance();
    allResults.push(...perfTests);

    // Test 5: Sécurité
    const securityTests = await this.testSecurityPermissions();
    allResults.push(...securityTests);

    return allResults;
  }

  // Afficher résultats dans la console
  static displayResults(results: TestResult[]) {
    console.log('\n📊 RAPPORT DE TESTS ADMIN');
    console.log('========================\n');

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      
      if (result.details && result.status === 'error') {
        console.log(`   Détails:`, result.details);
      }
    });

    console.log('\n📈 RÉSUMÉ:');
    console.log(`✅ Réussis: ${successCount}`);
    console.log(`⚠️ Avertissements: ${warningCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📊 Total: ${results.length} tests`);

    const successRate = Math.round((successCount / results.length) * 100);
    console.log(`🎯 Taux de réussite: ${successRate}%\n`);

    if (errorCount === 0 && warningCount === 0) {
      console.log('🎉 Tous les tests passent ! Interface admin prête pour la production.');
    } else if (errorCount === 0) {
      console.log('✨ Tests OK avec quelques avertissements. Vérifiez les performances.');
    } else {
      console.log('🚨 Erreurs détectées. Corrigez avant la mise en production.');
    }
  }
}

// Utilitaire pour test rapide depuis la console
export const quickAdminTest = async () => {
  const testSuite = new AdminTestSuite();
  const results = await testSuite.runAllTests();
  AdminTestSuite.displayResults(results);
  return results;
};