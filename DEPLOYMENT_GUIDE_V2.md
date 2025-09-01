# 🚀 Guide de Déploiement - Système Reçus V2

## 📋 Prérequis de Déploiement

### ✅ Checklist Technique

- [ ] **Base de données** : Tables `email_logs` et `email_settings` créées
- [ ] **Storage** : Bucket `receipts` configuré dans Supabase
- [ ] **Edge Functions** : `send-receipt-email` et `track-email-open` déployées  
- [ ] **SMTP** : Configuration mail fonctionnelle
- [ ] **Permissions** : RLS activées sur nouvelles tables
- [ ] **Tests** : Suite de tests V2 exécutée avec succès

---

## 🗄️ ÉTAPE 1 : Mise à jour Base de Données

### Exécuter le script SQL

```bash
# Dans Supabase Dashboard > SQL Editor
```

```sql
-- Copier-coller le contenu de database/email_logs_schema.sql
-- Puis exécuter
```

**✅ Validation :**
```sql
-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('email_logs', 'email_settings');

-- Vérifier les index
SELECT indexname FROM pg_indexes 
WHERE tablename = 'email_logs';

-- Tester l'insertion
INSERT INTO email_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
SELECT * FROM email_settings;
```

---

## 📦 ÉTAPE 2 : Configuration Storage

### Créer le bucket receipts

```javascript
// Dans Supabase Dashboard > Storage
// Ou via code :
const { data, error } = await supabase.storage.createBucket('receipts', {
  public: false,
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf', 'text/html']
});
```

**✅ Validation :**
```javascript
// Tester l'upload
const testFile = new Blob(['<html>Test</html>'], { type: 'text/html' });
const { data, error } = await supabase.storage
  .from('receipts')
  .upload('test/test.html', testFile);
console.log('Upload test:', { data, error });
```

---

## 🔧 ÉTAPE 3 : Déploiement Edge Functions

### Déployer les fonctions

```bash
# Fonction d'envoi d'email
supabase functions deploy send-receipt-email

# Fonction de tracking
supabase functions deploy track-email-open

# Vérifier le déploiement
supabase functions list
```

**✅ Validation :**
```bash
# Test fonction tracking
curl "https://your-project.supabase.co/functions/v1/track-email-open?receipt=TEST-123"
# Doit retourner un pixel GIF 1x1

# Test fonction email (depuis l'app)
# Créer une transaction avec email et vérifier l'envoi
```

---

## ⚙️ ÉTAPE 4 : Configuration Email Settings

### Paramétrer l'association

```sql
UPDATE email_settings SET 
  association_name = 'Amicale des Sapeurs-Pompiers de [VILLE]',
  association_address = 'Adresse complète de votre caserne',
  association_siren = 'Votre numéro SIREN',
  association_rna = 'Votre numéro RNA/W préfecture',
  legal_text = 'Ce reçu vous est délivré à des fins comptables et justificatives. Conservez-le précieusement pour vos déclarations fiscales.',
  enable_tracking = true -- Pour activer le tracking d'ouverture
WHERE id = 1;
```

**✅ Validation :**
```sql
SELECT * FROM email_settings WHERE id = 1;
```

---

## 📧 ÉTAPE 5 : Test Complet du Système

### Test automatisé
```bash
npm test src/shared/services/emailService.v2.test.ts
```

### Test manuel

1. **Créer transaction avec email** :
   - Se connecter comme sapeur
   - Créer transaction avec email donateur
   - Vérifier réception email avec nouveau template

2. **Vérifier logs** :
   - Aller sur `/admin/email-stats`
   - Voir la transaction dans les logs récents
   - Status doit être "sent"

3. **Test tracking** :
   - Ouvrir l'email reçu
   - Attendre 30 secondes
   - Recharger `/admin/email-stats`
   - Status doit passer à "opened"

4. **Test archivage** :
   - Vérifier présence fichiers dans Storage
   - Bucket `receipts` → `html-receipts/YYYY/MM/`

---

## 🔄 ÉTAPE 6 : Migration des Données Existantes

### Générer reçus pour anciennes transactions (optionnel)

```sql
-- Identifier transactions avec emails sans reçus
SELECT id, donator_email, donator_name, amount, created_at
FROM transactions 
WHERE donator_email IS NOT NULL 
AND receipt_number IS NULL
AND created_at >= '2024-01-01'
LIMIT 10;

-- Pour chacune, déclencher l'envoi via l'interface /admin/receipts
```

---

## 📊 ÉTAPE 7 : Monitoring et Surveillance

### Métriques à surveiller

1. **Taux de succès email** :
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE status = 'sent') as sent,
     ROUND(COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*), 2) as success_rate
   FROM email_logs
   WHERE created_at >= NOW() - INTERVAL '24 hours';
   ```

2. **Taux d'ouverture** :
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'sent') as sent,
     COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
     ROUND(COUNT(*) FILTER (WHERE opened_at IS NOT NULL) * 100.0 / 
           NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0), 2) as open_rate
   FROM email_logs
   WHERE created_at >= NOW() - INTERVAL '7 days';
   ```

3. **Erreurs fréquentes** :
   ```sql
   SELECT error_message, COUNT(*) as count
   FROM email_logs 
   WHERE status = 'failed'
   AND created_at >= NOW() - INTERVAL '24 hours'
   GROUP BY error_message
   ORDER BY count DESC;
   ```

### Alertes recommandées

- **Taux d'échec > 10%** → Vérifier SMTP
- **Pas d'ouvertures depuis 24h** → Vérifier tracking
- **Storage > 80%** → Nettoyer anciens fichiers

---

## 🛠️ ÉTAPE 8 : Maintenance

### Nettoyage automatique (optionnel)

```sql
-- Créer une fonction de nettoyage automatique
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_logs 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Créer un cron job (si extension pg_cron disponible)
-- SELECT cron.schedule('cleanup-emails', '0 2 * * 0', 'SELECT cleanup_old_email_logs();');
```

### Sauvegarde

- **Base de données** : Incluse dans backup Supabase standard
- **Storage** : Sauvegarder bucket `receipts` si critique
- **Fonctions** : Code versionné dans git

---

## 🚨 Plan de Rollback

En cas de problème critique :

### Rollback Niveau 1 - Désactiver nouvelles fonctionnalités
```sql
UPDATE email_settings SET enable_tracking = false WHERE id = 1;
```

### Rollback Niveau 2 - Revenir à V1
```bash
# Checkout commit précédent
git checkout [commit-avant-v2]
# Redéployer
npm run build && npm run deploy
```

### Rollback Niveau 3 - Complet
```sql
-- Supprimer nouvelles tables (ATTENTION : perte données)
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS email_settings CASCADE;
-- Supprimer bucket
-- Via Dashboard Supabase Storage
```

---

## ✅ Validation Post-Déploiement

### Checklist finale

- [ ] ✅ Transactions créent des logs email
- [ ] ✅ Templates HTML s'affichent correctement
- [ ] ✅ Tracking d'ouverture fonctionne
- [ ] ✅ Interface admin accessible (`/admin/email-stats`)
- [ ] ✅ Storage archive correctement
- [ ] ✅ Aucune régression sur fonctionnalités existantes
- [ ] ✅ Performance acceptable (< 2s création transaction)
- [ ] ✅ Logs d'erreur propres

### Tests de charge (recommandé)

```bash
# Simuler 100 envois simultanés
# Via script ou outil de charge
```

---

## 📞 Support Post-Déploiement

### Logs à surveiller
- **Supabase** : Dashboard > Logs > Edge Functions
- **Storage** : Dashboard > Storage > receipts
- **Database** : Dashboard > Database > email_logs

### Métriques de performance
- Temps moyen envoi email : **< 5 secondes**
- Taux d'échec : **< 5%**
- Utilisation Storage : **< 1GB/mois** (estimation)

### Contacts techniques
- **Base de données** : Logs Supabase Dashboard
- **SMTP** : Configuration dans env variables
- **Support** : Documentation complète dans `RECEIPTS_README.md`

---

## 🎉 Félicitations !

Votre système de reçus V2 est maintenant opérationnel avec :

✅ **Templates HTML professionnels**  
✅ **Logging complet des emails**  
✅ **Tracking d'ouverture avancé**  
✅ **Archivage Supabase Storage**  
✅ **Interface admin statistiques**  
✅ **Monitoring et alertes**  

Le système est prêt à traiter des milliers de reçus avec une traçabilité complète ! 🚒🔥