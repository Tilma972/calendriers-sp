-- database/email_logs_schema.sql - Nouvelles tables pour système de reçus avancé
-- À exécuter dans Supabase SQL Editor

-- Table pour les logs d'emails avec tracking complet
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  email_subject TEXT,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened')) DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ, -- Confirmation livraison SMTP
  opened_at TIMESTAMPTZ, -- Tracking ouverture (optionnel)
  clicked_at TIMESTAMPTZ, -- Premier clic dans email (optionnel)
  receipt_number TEXT, -- Duplication pour indexation rapide
  email_provider TEXT, -- Gmail, Outlook, etc. (détection auto)
  user_agent TEXT, -- Navigateur/client email si ouverture trackée
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance optimale
CREATE INDEX IF NOT EXISTS idx_email_logs_transaction ON email_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_to ON email_logs(email_to);
CREATE INDEX IF NOT EXISTS idx_email_logs_receipt_number ON email_logs(receipt_number);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- RLS (Row Level Security) pour sécurité
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policy : Seuls les chefs d'équipe et trésoriers peuvent lire les logs
CREATE POLICY "email_logs_read_policy" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('chef_equipe', 'tresorier')
    )
  );

-- Policy : Seuls les chefs d'équipe et trésoriers peuvent créer des logs
CREATE POLICY "email_logs_insert_policy" ON email_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('chef_equipe', 'tresorier', 'sapeur')
    )
  );

-- Table pour configuration emails (settings avancés)
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1, -- Singleton table
  smtp_from_name TEXT DEFAULT 'Sapeurs-Pompiers Calendriers 2025',
  smtp_from_email TEXT DEFAULT 'no-reply@pompiers34800.com',
  association_name TEXT DEFAULT 'Amicale des Sapeurs-Pompiers',
  association_address TEXT DEFAULT 'Adresse à compléter',
  association_siren TEXT,
  association_rna TEXT,
  legal_text TEXT DEFAULT 'Ce reçu vous est délivré à des fins comptables et justificatives.',
  enable_tracking BOOLEAN DEFAULT false,
  enable_pdf_generation BOOLEAN DEFAULT false,
  template_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Contrainte pour n'avoir qu'un seul enregistrement
  CONSTRAINT single_email_settings CHECK (id = 1)
);

-- Insérer configuration par défaut
INSERT INTO email_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS pour email_settings
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Policy : Lecture pour tous les utilisateurs connectés
CREATE POLICY "email_settings_read_policy" ON email_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy : Seuls les trésoriers peuvent modifier
CREATE POLICY "email_settings_update_policy" ON email_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tresorier'
    )
  );

-- Fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_email_logs_updated_at 
  BEFORE UPDATE ON email_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at 
  BEFORE UPDATE ON email_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vue pour statistiques emails (pour dashboard admin)
CREATE OR REPLACE VIEW email_stats AS
SELECT 
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as successful_sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_sent,
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened_count,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked_count,
  ROUND(
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0), 
    2
  ) as open_rate_percent,
  DATE_TRUNC('day', created_at) as date_sent
FROM email_logs 
WHERE status IN ('sent', 'delivered', 'opened')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date_sent DESC;

-- Grant permissions sur la vue pour les admins
GRANT SELECT ON email_stats TO authenticated;

-- Commentaires pour documentation
COMMENT ON TABLE email_logs IS 'Logs complets des emails de reçus envoyés avec tracking';
COMMENT ON TABLE email_settings IS 'Configuration globale du système email (singleton)';
COMMENT ON VIEW email_stats IS 'Statistiques agrégées des performances email par jour';

-- Migration note
COMMENT ON COLUMN email_logs.email_provider IS 'Auto-détecté depuis email_to (gmail.com -> Gmail)';
COMMENT ON COLUMN email_logs.user_agent IS 'Client email détecté lors de l''ouverture (si tracking activé)';
COMMENT ON COLUMN email_settings.template_version IS 'Version du template HTML pour A/B testing future';

-- Table pour logs des workflows n8n (génération PDF + envoi email)
CREATE TABLE IF NOT EXISTS n8n_workflow_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL, -- Référence à la transaction
  workflow_action TEXT CHECK (workflow_action IN ('generate_and_send_receipt', 'generate_pdf_only', 'health_check')) NOT NULL,
  payload_data JSONB NOT NULL, -- Payload envoyé à n8n
  response_data JSONB, -- Réponse de n8n
  success BOOLEAN DEFAULT false,
  workflow_id TEXT, -- ID d'exécution n8n
  error_message TEXT,
  processing_time_ms INTEGER, -- Temps de traitement si fourni par n8n
  webhook_url TEXT, -- URL du webhook utilisé
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance optimale sur n8n_workflow_logs
CREATE INDEX IF NOT EXISTS idx_n8n_logs_transaction ON n8n_workflow_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_success ON n8n_workflow_logs(success);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_workflow_action ON n8n_workflow_logs(workflow_action);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_workflow_id ON n8n_workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_created_at ON n8n_workflow_logs(created_at DESC);

-- RLS pour n8n_workflow_logs
ALTER TABLE n8n_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Policy : Seuls les chefs d'équipe et trésoriers peuvent lire les logs n8n
CREATE POLICY "n8n_logs_read_policy" ON n8n_workflow_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('chef_equipe', 'tresorier')
    )
  );

-- Policy : L'application peut créer des logs n8n (via service account ou API)
CREATE POLICY "n8n_logs_insert_policy" ON n8n_workflow_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('chef_equipe', 'tresorier', 'sapeur')
    )
    OR auth.uid() IS NULL -- Permet l'insertion via service account
  );

-- Trigger pour updated_at sur n8n_workflow_logs
CREATE TRIGGER update_n8n_logs_updated_at 
  BEFORE UPDATE ON n8n_workflow_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vue pour statistiques n8n (pour monitoring)
CREATE OR REPLACE VIEW n8n_workflow_stats AS
SELECT 
  workflow_action,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  ROUND(
    COUNT(*) FILTER (WHERE success = true) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent,
  AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL) as avg_processing_time_ms,
  MAX(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL) as max_processing_time_ms,
  DATE_TRUNC('day', created_at) as date_requested
FROM n8n_workflow_logs 
GROUP BY workflow_action, DATE_TRUNC('day', created_at)
ORDER BY date_requested DESC, workflow_action;

-- Grant permissions sur la vue n8n pour les admins
GRANT SELECT ON n8n_workflow_stats TO authenticated;

-- Commentaires pour documentation n8n
COMMENT ON TABLE n8n_workflow_logs IS 'Logs des requêtes vers les workflows n8n (PDF + email)';
COMMENT ON VIEW n8n_workflow_stats IS 'Statistiques des performances des workflows n8n par jour et action';
COMMENT ON COLUMN n8n_workflow_logs.payload_data IS 'Données complètes envoyées au webhook n8n (format JSON)';
COMMENT ON COLUMN n8n_workflow_logs.response_data IS 'Réponse complète reçue de n8n (format JSON)';
COMMENT ON COLUMN n8n_workflow_logs.workflow_id IS 'ID d''exécution unique fourni par n8n';
COMMENT ON COLUMN n8n_workflow_logs.processing_time_ms IS 'Temps de traitement en millisecondes (si fourni par n8n)';