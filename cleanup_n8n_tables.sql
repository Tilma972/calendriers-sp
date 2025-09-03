-- cleanup_n8n_tables.sql
-- Script de nettoyage pour supprimer toutes les références à n8n de la base de données
-- 
-- ⚠️ ATTENTION: Ce script supprime définitivement les données liées à n8n
-- Vérifiez que vous avez une sauvegarde avant d'exécuter ce script
--
-- Généré automatiquement le 2025-03-09 par Claude Code

-- ============================================================================
-- 1. SUPPRESSION DES TABLES N8N
-- ============================================================================

-- Supprimer la table des logs de workflow n8n
DROP TABLE IF EXISTS n8n_workflow_logs CASCADE;

-- ============================================================================
-- 2. SUPPRESSION DES VUES N8N
-- ============================================================================

-- Supprimer la vue des statistiques de workflow n8n
DROP VIEW IF EXISTS n8n_workflow_stats CASCADE;

-- ============================================================================
-- 3. SUPPRESSION DES FONCTIONS N8N
-- ============================================================================

-- Supprimer toute fonction liée à n8n (exemple)
DROP FUNCTION IF EXISTS get_n8n_workflow_stats() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_n8n_logs() CASCADE;

-- ============================================================================
-- 4. SUPPRESSION DES TRIGGERS N8N
-- ============================================================================

-- Supprimer les triggers liés aux logs n8n (s'ils existent)
DROP TRIGGER IF EXISTS trigger_n8n_workflow_log_update ON n8n_workflow_logs;
DROP TRIGGER IF EXISTS trigger_n8n_stats_refresh ON n8n_workflow_logs;

-- ============================================================================
-- 5. SUPPRESSION DES INDEX N8N
-- ============================================================================

-- Supprimer les index liés à n8n (ils seront supprimés automatiquement avec les tables,
-- mais on les liste ici pour référence)
-- DROP INDEX IF EXISTS idx_n8n_workflow_logs_transaction_id;
-- DROP INDEX IF EXISTS idx_n8n_workflow_logs_created_at;
-- DROP INDEX IF EXISTS idx_n8n_workflow_logs_success;

-- ============================================================================
-- 6. NETTOYAGE DES COLONNES N8N DANS LES TABLES EXISTANTES
-- ============================================================================

-- Vérifier si des colonnes liées à n8n existent dans d'autres tables
-- et les supprimer si nécessaire

-- Exemple: si la table transactions avait une colonne n8n_workflow_id
-- ALTER TABLE transactions DROP COLUMN IF EXISTS n8n_workflow_id CASCADE;

-- Exemple: si la table email_logs avait une colonne n8n_execution_id
-- ALTER TABLE email_logs DROP COLUMN IF EXISTS n8n_execution_id CASCADE;

-- ============================================================================
-- 7. SUPPRESSION DES TYPES PERSONNALISÉS N8N
-- ============================================================================

-- Supprimer les types énumérés liés à n8n (s'ils existent)
-- DROP TYPE IF EXISTS n8n_workflow_status CASCADE;

-- ============================================================================
-- 8. NETTOYAGE DES DONNÉES DANS LES TABLES DE CONFIGURATION
-- ============================================================================

-- Supprimer les paramètres de configuration liés à n8n
DELETE FROM email_settings WHERE setting_key LIKE '%n8n%' OR setting_key LIKE '%workflow%';

-- Si vous avez une table de paramètres généraux
-- DELETE FROM app_settings WHERE key LIKE '%n8n%' OR key LIKE '%N8N%';

-- ============================================================================
-- 9. VÉRIFICATION POST-NETTOYAGE
-- ============================================================================

-- Vérifier qu'il ne reste plus de tables contenant "n8n"
DO $$
DECLARE
    table_record RECORD;
    n8n_tables_count INTEGER := 0;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE '%n8n%' 
        AND schemaname = 'public'
    LOOP
        RAISE NOTICE 'ATTENTION: Table restante contenant n8n: %.%', table_record.schemaname, table_record.tablename;
        n8n_tables_count := n8n_tables_count + 1;
    END LOOP;
    
    IF n8n_tables_count = 0 THEN
        RAISE NOTICE '✅ Aucune table contenant n8n trouvée. Nettoyage réussi.';
    ELSE
        RAISE NOTICE '⚠️ % table(s) contenant n8n encore présente(s).', n8n_tables_count;
    END IF;
END $$;

-- Vérifier qu'il ne reste plus de colonnes contenant "n8n"
DO $$
DECLARE
    column_record RECORD;
    n8n_columns_count INTEGER := 0;
BEGIN
    FOR column_record IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE column_name LIKE '%n8n%' 
        AND table_schema = 'public'
    LOOP
        RAISE NOTICE 'ATTENTION: Colonne restante contenant n8n: %.%', column_record.table_name, column_record.column_name;
        n8n_columns_count := n8n_columns_count + 1;
    END LOOP;
    
    IF n8n_columns_count = 0 THEN
        RAISE NOTICE '✅ Aucune colonne contenant n8n trouvée. Nettoyage réussi.';
    ELSE
        RAISE NOTICE '⚠️ % colonne(s) contenant n8n encore présente(s).', n8n_columns_count;
    END IF;
END $$;

-- ============================================================================
-- 10. NOTES FINALES
-- ============================================================================

/*
ACTIONS RECOMMANDÉES APRÈS CE NETTOYAGE:

1. Vérifiez que l'application fonctionne correctement sans n8n
2. Supprimez les variables d'environnement liées à n8n:
   - N8N_WEBHOOK_URL
   - N8N_API_KEY
   - N8N_RECEIPT_WEBHOOK_URL
   - NEXT_PUBLIC_N8N_WEBHOOK_URL

3. Mettez à jour votre documentation pour refléter le nouveau système direct

4. Vérifiez les logs de l'application pour détecter d'éventuelles références manquées

5. Testez la génération de reçus avec le nouveau système basé sur Gotenberg + SMTP

BACKUP RECOMMANDÉ:
Avant d'exécuter ce script, créez une sauvegarde complète:
pg_dump -h localhost -U your_user -d your_database > backup_before_n8n_cleanup.sql

ROLLBACK EN CAS DE PROBLÈME:
Si vous devez annuler ce nettoyage:
psql -h localhost -U your_user -d your_database < backup_before_n8n_cleanup.sql
*/

-- ============================================================================
-- FIN DU SCRIPT DE NETTOYAGE N8N
-- ============================================================================

COMMIT;