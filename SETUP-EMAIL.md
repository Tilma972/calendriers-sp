# 📧 Guide de Configuration Email - Reçus Automatiques

## 🚨 Problème : "Je ne reçois aucun email"

Voici les étapes pour diagnostiquer et corriger l'envoi d'emails :

## 1. 🔧 Configuration SMTP dans Supabase

### Étape A: Vérifier la table `email_settings`
```sql
-- Dans l'éditeur SQL de Supabase, exécutez:
SELECT * FROM email_settings WHERE id = 1;
```

### Étape B: Si la table est vide, créer la configuration
```sql
INSERT INTO email_settings (
  id,
  smtp_host,
  smtp_port,
  smtp_user,
  smtp_password,
  smtp_from_name,
  smtp_from_email,
  association_name,
  association_address,
  association_siren,
  association_rna
) VALUES (
  1,
  'smtp.gmail.com',                    -- Serveur SMTP
  587,                                 -- Port (587 pour TLS, 465 pour SSL)
  'votre-email@gmail.com',             -- Votre email Gmail
  'votre-mot-de-passe-application',    -- Mot de passe d'application Gmail
  'Sapeurs-Pompiers Clermont',         -- Nom expéditeur
  'votre-email@gmail.com',             -- Email expéditeur
  'Amicale des Sapeurs-Pompiers de Clermont-l''Hérault',
  '34800 Clermont-l''Hérault, France',
  'VOTRE_SIREN',                       -- Numéro SIREN
  'VOTRE_RNA'                          -- Numéro RNA
);
```

## 2. 🔑 Configuration Gmail (Recommandé)

### Étape A: Activer l'authentification 2 facteurs
1. Allez dans votre compte Google
2. Sécurité > Validation en 2 étapes > Activez

### Étape B: Créer un mot de passe d'application
1. Compte Google > Sécurité
2. Validation en 2 étapes > Mots de passe des applications
3. Créez un nouveau mot de passe pour "Mail"
4. Utilisez ce mot de passe dans `smtp_password`

## 3. 🖨️ Configuration Gotenberg (PDF)

### Dans votre fichier `.env.local` :
```bash
GOTENBERG_URL=https://gotenberg.dsolution-ia.fr
GOTENBERG_USERNAME=votre-username-gotenberg
GOTENBERG_PASSWORD=votre-password-gotenberg
```

## 4. 🧪 Test de Configuration

### Méthode 1: Via l'interface admin
1. Allez dans `/admin/receipts`
2. Recherchez une transaction avec email
3. Cliquez sur "Renvoyer"
4. Vérifiez les logs

### Méthode 2: Via API directement
```bash
curl -X POST https://votre-app.vercel.app/api/donations/send-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "ID_DE_TRANSACTION",
    "force_resend": true
  }'
```

### Méthode 3: Health Check
```bash
curl https://votre-app.vercel.app/api/donations/send-receipt
```

## 5. 🔍 Diagnostic des Problèmes Courants

### Problème: "Configuration SMTP non trouvée"
**Solution**: Exécutez l'INSERT dans email_settings (étape 1B)

### Problème: "Authentification SMTP échouée"
**Solutions**:
- Vérifiez username/password Gmail
- Utilisez un mot de passe d'application (pas votre mot de passe Gmail)
- Vérifiez que l'authentification 2 facteurs est activée

### Problème: "Erreur conversion PDF"
**Solutions**:
- Vérifiez les variables d'environnement Gotenberg
- Testez la connexion Gotenberg : `curl https://gotenberg.dsolution-ia.fr/health`

### Problème: "Transaction non trouvée"
**Solutions**:
- Vérifiez que la transaction a un `donator_email`
- Utilisez le bon `transaction_id` (vérifiez dans `/admin/transactions`)

## 6. 🚀 Test Complet

### Créer une transaction test:
1. Allez sur l'app principale
2. Créez un "Don exceptionnel avec reçu"
3. Remplissez OBLIGATOIREMENT l'email du donateur
4. Soumettez
5. L'email devrait partir automatiquement

### Vérifier les logs:
```sql
-- Derniers logs d'emails
SELECT * FROM email_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Transactions avec reçus
SELECT id, donator_name, donator_email, receipt_status, receipt_number
FROM transactions 
WHERE donator_email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## 7. 📞 Support

Si le problème persiste :
1. Vérifiez les logs de Vercel/votre plateforme
2. Regardez la console développeur lors de l'envoi
3. Testez d'abord avec un email que vous contrôlez
4. Vérifiez les spams de votre boîte mail

---

## ⚡ Configuration Express (TL;DR)

1. **Gmail** : Activez 2FA + créez mot de passe application
2. **SQL** : `INSERT INTO email_settings (id, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name, smtp_from_email) VALUES (1, 'smtp.gmail.com', 587, 'vous@gmail.com', 'mot-de-passe-app', 'Sapeurs-Pompiers', 'vous@gmail.com');`  
3. **ENV** : Variables Gotenberg dans `.env.local`
4. **TEST** : Créez un don avec email dans l'app