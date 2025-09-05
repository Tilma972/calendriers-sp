-- Migration pour ajouter le système de paiement QR Code
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne stripe_payment_link_url à la table teams
ALTER TABLE teams 
ADD COLUMN stripe_payment_link_url TEXT;

-- 2. Créer la table qr_interactions pour tracker les interactions QR
CREATE TABLE IF NOT EXISTS qr_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  interaction_id TEXT UNIQUE NOT NULL, -- Identifiant unique pour chaque scan QR
  status TEXT CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')) DEFAULT 'pending',
  amount DECIMAL(10,2) DEFAULT 10.00, -- Montant fixe d'un calendrier
  calendars_count INTEGER DEFAULT 1, -- Nombre de calendriers (toujours 1)
  stripe_session_id TEXT, -- ID de session Stripe pour tracking
  donator_name TEXT,
  donator_email TEXT,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '10 minutes'), -- Expiration 10 minutes
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Ajouter le nouveau payment_method 'carte_qr' à l'enum existant
ALTER TYPE payment_method_enum ADD VALUE 'carte_qr';

-- 4. Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_qr_interactions_team_id ON qr_interactions(team_id);
CREATE INDEX IF NOT EXISTS idx_qr_interactions_interaction_id ON qr_interactions(interaction_id);
CREATE INDEX IF NOT EXISTS idx_qr_interactions_status ON qr_interactions(status);
CREATE INDEX IF NOT EXISTS idx_qr_interactions_expires_at ON qr_interactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_interactions_stripe_session_id ON qr_interactions(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- 5. Créer une fonction pour nettoyer automatiquement les interactions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_qr_interactions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Marquer comme expirées les interactions en attente qui ont dépassé le délai
  UPDATE qr_interactions 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Optionnel: supprimer les interactions expirées de plus de 24h
  DELETE FROM qr_interactions 
  WHERE status = 'expired' AND updated_at < (now() - INTERVAL '24 hours');
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer une trigger function pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Créer le trigger pour qr_interactions
DROP TRIGGER IF EXISTS update_qr_interactions_updated_at ON qr_interactions;
CREATE TRIGGER update_qr_interactions_updated_at
    BEFORE UPDATE ON qr_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Créer une vue pour les statistiques QR par équipe
CREATE OR REPLACE VIEW v_qr_stats_by_team AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.color as team_color,
    COUNT(qi.id) as total_interactions,
    COUNT(CASE WHEN qi.status = 'completed' THEN 1 END) as completed_interactions,
    COUNT(CASE WHEN qi.status = 'pending' THEN 1 END) as pending_interactions,
    COUNT(CASE WHEN qi.status = 'expired' THEN 1 END) as expired_interactions,
    COALESCE(SUM(CASE WHEN qi.status = 'completed' THEN qi.amount ELSE 0 END), 0) as total_amount_qr,
    ROUND(
        CASE 
            WHEN COUNT(qi.id) > 0 THEN 
                (COUNT(CASE WHEN qi.status = 'completed' THEN 1 END)::DECIMAL / COUNT(qi.id) * 100)
            ELSE 0 
        END, 2
    ) as conversion_rate
FROM teams t
LEFT JOIN qr_interactions qi ON t.id = qi.team_id
GROUP BY t.id, t.name, t.color
ORDER BY total_amount_qr DESC;

-- 9. Créer des politiques RLS (Row Level Security) pour qr_interactions
ALTER TABLE qr_interactions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à tout le monde de créer des interactions QR
CREATE POLICY "Allow public to create QR interactions" 
ON qr_interactions FOR INSERT 
TO public 
WITH CHECK (true);

-- Politique pour permettre la lecture des interactions QR selon le rôle
CREATE POLICY "Allow users to read QR interactions based on role" 
ON qr_interactions FOR SELECT 
TO authenticated 
USING (
  -- Trésoriers peuvent tout voir
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'tresorier'
  )
  OR
  -- Chefs d'équipe peuvent voir leur équipe
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'chef_equipe'
    AND profiles.team_id = qr_interactions.team_id
  )
  OR
  -- Sapeurs peuvent voir leur équipe
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'sapeur'
    AND profiles.team_id = qr_interactions.team_id
  )
);

-- Politique pour permettre la mise à jour (pour les webhooks et le système)
CREATE POLICY "Allow system to update QR interactions" 
ON qr_interactions FOR UPDATE 
TO service_role 
USING (true);

-- 10. Créer une fonction pour générer un interaction_id unique
CREATE OR REPLACE FUNCTION generate_qr_interaction_id(team_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  team_short_id TEXT;
  timestamp_part TEXT;
  random_part TEXT;
  interaction_id TEXT;
BEGIN
  -- Prendre les 8 premiers caractères de l'UUID de l'équipe (sans tirets)
  team_short_id := REPLACE(team_uuid::TEXT, '-', '')::TEXT;
  team_short_id := SUBSTRING(team_short_id, 1, 8);
  
  -- Timestamp en format compact (epoch secondes en base36)
  timestamp_part := LPAD(LTRIM(TO_CHAR(EXTRACT(EPOCH FROM now())::BIGINT, 'FM9999999999999'), '0'), 8, '0');
  
  -- Partie aléatoire de 4 caractères
  random_part := SUBSTRING(MD5(random()::TEXT), 1, 4);
  
  -- Construire l'ID: QR-[TEAM8]-[TIMESTAMP8]-[RANDOM4]
  interaction_id := 'QR-' || UPPER(team_short_id) || '-' || timestamp_part || '-' || UPPER(random_part);
  
  RETURN interaction_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Ajouter quelques commentaires sur les tables pour la documentation
COMMENT ON TABLE qr_interactions IS 'Stocke les interactions de paiement QR Code avec timeout de 10 minutes';
COMMENT ON COLUMN qr_interactions.interaction_id IS 'Identifiant unique généré pour chaque scan QR (format: QR-TEAMID-TIMESTAMP-RANDOM)';
COMMENT ON COLUMN qr_interactions.expires_at IS 'Timestamp d''expiration de l''interaction (10 minutes par défaut)';
COMMENT ON COLUMN qr_interactions.stripe_session_id IS 'ID de session Stripe pour le suivi du paiement';
COMMENT ON COLUMN teams.stripe_payment_link_url IS 'URL du Payment Link Stripe pré-créé pour cette équipe';

-- 12. Insérer des exemples de Payment Links pour les 5 équipes (à adapter selon vos équipes réelles)
-- NOTE: Remplacez ces URLs par vos vrais Payment Links Stripe
UPDATE teams SET stripe_payment_link_url = 'https://buy.stripe.com/test_example1' WHERE name ILIKE '%équipe 1%' OR name ILIKE '%team 1%';
UPDATE teams SET stripe_payment_link_url = 'https://buy.stripe.com/test_example2' WHERE name ILIKE '%équipe 2%' OR name ILIKE '%team 2%';
UPDATE teams SET stripe_payment_link_url = 'https://buy.stripe.com/test_example3' WHERE name ILIKE '%équipe 3%' OR name ILIKE '%team 3%';
UPDATE teams SET stripe_payment_link_url = 'https://buy.stripe.com/test_example4' WHERE name ILIKE '%équipe 4%' OR name ILIKE '%team 4%';
UPDATE teams SET stripe_payment_link_url = 'https://buy.stripe.com/test_example5' WHERE name ILIKE '%équipe 5%' OR name ILIKE '%team 5%';

-- 13. Créer une fonction pour initier une interaction QR
CREATE OR REPLACE FUNCTION initiate_qr_interaction(
  team_uuid UUID,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS TABLE (
  interaction_id TEXT,
  stripe_payment_link_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  new_interaction_id TEXT;
  payment_link_url TEXT;
  expiration_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Vérifier que l'équipe existe et a un payment link
  SELECT teams.stripe_payment_link_url INTO payment_link_url
  FROM teams 
  WHERE teams.id = team_uuid AND teams.stripe_payment_link_url IS NOT NULL;
  
  IF payment_link_url IS NULL THEN
    RAISE EXCEPTION 'Team not found or no payment link configured for team %', team_uuid;
  END IF;
  
  -- Générer un ID unique pour cette interaction
  new_interaction_id := generate_qr_interaction_id(team_uuid);
  
  -- Calculer le temps d'expiration (10 minutes)
  expiration_time := now() + INTERVAL '10 minutes';
  
  -- Insérer la nouvelle interaction
  INSERT INTO qr_interactions (
    team_id, 
    interaction_id, 
    status, 
    user_agent, 
    ip_address, 
    expires_at
  ) VALUES (
    team_uuid,
    new_interaction_id,
    'pending',
    user_agent_param,
    ip_address_param,
    expiration_time
  );
  
  -- Nettoyer les interactions expirées (maintenance)
  PERFORM cleanup_expired_qr_interactions();
  
  -- Retourner les informations nécessaires
  RETURN QUERY SELECT 
    new_interaction_id,
    payment_link_url,
    expiration_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Créer une fonction pour finaliser une interaction QR (appelée par le webhook Stripe)
CREATE OR REPLACE FUNCTION complete_qr_interaction(
  interaction_id_param TEXT,
  stripe_session_id_param TEXT,
  donator_name_param TEXT DEFAULT NULL,
  donator_email_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  transaction_id UUID,
  team_id UUID,
  team_name TEXT
) AS $$
DECLARE
  qr_record RECORD;
  new_transaction_id UUID;
BEGIN
  -- Récupérer l'interaction QR avec les infos de l'équipe
  SELECT 
    qi.*,
    t.name as team_name
  INTO qr_record
  FROM qr_interactions qi
  JOIN teams t ON qi.team_id = t.id
  WHERE qi.interaction_id = interaction_id_param
    AND qi.status = 'pending'
    AND qi.expires_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Marquer l'interaction comme complétée
  UPDATE qr_interactions SET 
    status = 'completed',
    stripe_session_id = stripe_session_id_param,
    donator_name = donator_name_param,
    donator_email = donator_email_param,
    completed_at = now(),
    updated_at = now()
  WHERE interaction_id = interaction_id_param;
  
  -- Créer une transaction automatique (sans user_id car c'est un paiement QR autonome)
  INSERT INTO transactions (
    team_id,
    amount,
    calendars_given,
    payment_method,
    donator_name,
    donator_email,
    stripe_session_id,
    status,
    notes,
    user_id -- On peut mettre l'ID d'un utilisateur système ou laisser vide selon votre logique
  ) VALUES (
    qr_record.team_id,
    qr_record.amount,
    qr_record.calendars_count,
    'carte_qr',
    donator_name_param,
    donator_email_param,
    stripe_session_id_param,
    'validated_team', -- Auto-validé pour les paiements QR
    'Paiement QR automatique - ID: ' || interaction_id_param,
    (SELECT id FROM profiles WHERE role = 'tresorier' LIMIT 1) -- ou NULL si vous préférez
  ) RETURNING id INTO new_transaction_id;
  
  RETURN QUERY SELECT 
    true,
    new_transaction_id,
    qr_record.team_id,
    qr_record.team_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;