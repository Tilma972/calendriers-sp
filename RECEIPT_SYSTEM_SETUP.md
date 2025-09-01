# Système de Reçus Automatiques - Guide de Configuration

Ce guide détaille la configuration et l'installation du système de génération automatique de reçus utilisant n8n + Gotenberg + Supabase.

## 🏗️ Architecture du système

```
Frontend/App → API /api/donations/send-receipt → ReceiptService → n8n Workflow
                        ↓                              ↓                ↓
                 Idempotence Cache              Supabase Logs      Gotenberg PDF → SMTP Email
                        ↓                              ↑                           ↓
                 ReceiptStorageService ← Callback /api/webhooks/n8n-callback ← n8n Response
```

### Nouveautés v2.0 :
- **API Route dédiée** : `/api/donations/send-receipt` avec idempotence
- **ReceiptStorageService** : Gestion centralisée des logs et stockage
- **Cache d'idempotence** : Évite les doublons sur 5 minutes
- **Health monitoring** : Endpoints GET/DELETE pour surveillance
- **Interface de test** : Composant intégré pour valider l'API

## 📋 Prérequis

### 1. Services externes requis
- **n8n** : Workflow automation (self-hosted ou cloud)
- **Gotenberg** : Service de génération PDF (self-hosted ou cloud)
- **Supabase** : Base de données et authentification (déjà configuré)
- **SMTP** : Service d'envoi email (configurable dans n8n)

### 2. Tables Supabase à créer
Exécutez le script SQL : `database/email_logs_schema.sql`

```sql
-- Tables principales:
-- • email_logs: Logs des emails envoyés
-- • email_settings: Configuration email globale
-- • n8n_workflow_logs: Logs des workflows n8n
```

## ⚙️ Configuration

### 1. Variables d'environnement
Copiez `.env.example` vers `.env.local` et configurez :

```bash
# Configuration n8n + Gotenberg pour les reçus
N8N_RECEIPT_WEBHOOK_URL="https://votre-n8n.domain.com/webhook/receipt-generator"
N8N_API_KEY="votre-cle-api-n8n-optionnelle"
GOTENBERG_URL="https://votre-gotenberg.domain.com"

# URL de l'application (pour les callbacks)
NEXT_PUBLIC_APP_URL="https://votre-app.domain.com"
```

### 2. Configuration n8n Workflow

#### Webhook d'entrée
- **URL** : `/webhook/receipt-generator`
- **Méthode** : POST
- **Payload attendu** :
```json
{
  "action": "generate_and_send_receipt",
  "receipt_data": {
    "receiptNumber": "RECU-2024-01-15-ABC123",
    "donatorName": "Jean Dupont",
    "donatorEmail": "jean@example.com",
    "amount": 25,
    "calendarsGiven": 2,
    "paymentMethod": "especes",
    "sapeurName": "Pierre Martin",
    "associationName": "Amicale des Sapeurs-Pompiers",
    "transactionId": "uuid-transaction"
  },
  "options": {
    "send_email": true,
    "generate_pdf": true,
    "quality": "standard"
  },
  "callback_url": "https://votre-app.domain.com/api/webhooks/n8n-callback"
}
```

#### Étapes du workflow n8n recommandées

1. **HTTP Request (Webhook Trigger)**
   - Reçoit les données de reçu

2. **Template HTML (Code Node)**
   ```javascript
   // Générer le HTML à partir des données
   const html = generateReceiptHTML($json.receipt_data);
   return { html };
   ```

3. **HTTP Request vers Gotenberg**
   - **URL** : `${GOTENBERG_URL}/forms/chromium/convert/html`
   - **Méthode** : POST
   - **Body** : Form-data avec le HTML
   - **Headers** : 
     ```
     Content-Type: multipart/form-data
     ```

4. **File Upload (optionnel)**
   - Stocker le PDF généré (AWS S3, Supabase Storage, etc.)

5. **SMTP Email (si send_email=true)**
   - **À** : `$json.receipt_data.donatorEmail`
   - **Sujet** : "Reçu de don - {{donatorName}}"
   - **Pièce jointe** : PDF généré

6. **Callback HTTP Request**
   - **URL** : `$json.callback_url`
   - **Payload** :
   ```json
   {
     "workflowId": "$workflow.id",
     "executionId": "$execution.id", 
     "status": "success",
     "result": {
       "pdfUrl": "https://...",
       "emailSent": true,
       "processingTime": 3500
     },
     "transactionId": "$json.receipt_data.transactionId"
   }
   ```

### 3. Configuration Gotenberg

#### Docker (recommandé)
```bash
docker run -d \
  --name gotenberg \
  -p 3000:3000 \
  gotenberg/gotenberg:latest \
  gotenberg \
  --chromium-disable-web-security \
  --chromium-allow-list="*" \
  --webhook-allow-list="*"
```

#### Options importantes
- `--chromium-disable-web-security` : Pour les CSS externes
- `--webhook-allow-list="*"` : Pour autoriser les callbacks
- Port par défaut : 3000

## 🧪 Tests et validation

### 1. Via l'interface admin
- Accédez à `/admin/receipts`
- Utilisez "⚙️ Config" pour vérifier la configuration
- "🔗 Test n8n" pour tester la connexion
- "🧪 Test reçu" pour générer un PDF de test
- **NOUVEAU** : Section "Test API Send-Receipt" pour tester l'API complète

### 2. API Tests directs

#### Test simple
```bash
curl -X POST http://localhost:3000/api/donations/send-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "votre-transaction-id",
    "donatorInfo": {
      "name": "Jean Dupont Test",
      "email": "jean.test@example.com"
    },
    "options": {
      "quality": "standard",
      "sendEmail": true
    }
  }'
```

#### Health Check
```bash
curl http://localhost:3000/api/donations/send-receipt
```

#### Clear Cache
```bash
curl -X DELETE http://localhost:3000/api/donations/send-receipt?force=true
```

### 3. Tests avec le hook React
```typescript
import { useSendReceipt } from '@/shared/hooks/useSendReceipt';

const { sendReceipt, generateTestPDF, checkHealth } = useSendReceipt();

// Envoyer un reçu
const result = await sendReceipt('transaction-id', {
  donatorInfo: { email: 'test@example.com' },
  options: { quality: 'draft' }
});

// Test PDF seulement
const pdfResult = await generateTestPDF('transaction-id');

// Check santé API
const health = await checkHealth();
```

### 4. Tests d'idempotence
```typescript
// Ces deux appels successifs ne génèreront qu'un seul reçu
await sendReceipt('same-transaction-id');
await sendReceipt('same-transaction-id'); // ← Réponse depuis le cache
```

## 📡 API Routes

### 1. POST `/api/donations/send-receipt`
**Envoie un reçu pour une transaction avec idempotence**

```json
{
  "transactionId": "uuid-required",
  "resend": false,
  "donatorInfo": {
    "name": "Nom donateur (optionnel)",
    "email": "email@example.com (optionnel si déjà dans la transaction)"
  },
  "sapeurInfo": {
    "name": "Nom sapeur (optionnel)"
  },
  "options": {
    "quality": "draft|standard|high",
    "sendEmail": true
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "receiptNumber": "RECU-2024-01-15-ABC123",
  "emailTo": "donateur@example.com",
  "workflowId": "n8n-workflow-id",
  "message": "Reçu envoyé avec succès",
  "fromCache": false,
  "transactionId": "uuid"
}
```

### 2. GET `/api/donations/send-receipt`
**Health check et monitoring de l'API**

Retourne l'état de santé complet de l'API : n8n, storage, database, cache.

### 3. DELETE `/api/donations/send-receipt?force=true`
**Nettoyage du cache d'idempotence**

- Sans `force` : supprime les entrées expirées
- Avec `force=true` : vide complètement le cache

### 4. POST `/api/webhooks/n8n-callback`
**Callback automatique depuis n8n (déjà implémenté)**

## 🔍 Monitoring et logs

### 1. Tables de monitoring
- **n8n_workflow_logs** : Logs des requêtes n8n
- **email_logs** : Logs des emails envoyés
- **email_stats** (vue) : Statistiques d'envoi
- **n8n_workflow_stats** (vue) : Statistiques n8n

### 2. Interface d'administration
- Statistiques temps réel : Total, en attente, succès, échecs
- Monitoring des workflows n8n
- Logs détaillés avec retry et erreurs
- Actions batch pour traitement en masse

### 3. Callback automatique
- L'API `/api/webhooks/n8n-callback` met à jour automatiquement :
  - Le statut des transactions
  - Les logs d'emails
  - Les logs de workflows

## 🚨 Troubleshooting

### Problèmes courants

#### 1. "N8N_WEBHOOK_URL non configurée"
- Vérifiez les variables d'environnement
- Redémarrez l'application après modification

#### 2. "Connexion n8n échoue"
- Vérifiez l'URL et la disponibilité du service n8n
- Testez avec curl/Postman
- Vérifiez les headers d'authentification

#### 3. "PDF non généré"
- Vérifiez que Gotenberg est accessible
- Testez directement l'API Gotenberg
- Vérifiez les logs n8n

#### 4. "Emails non envoyés"
- Vérifiez la configuration SMTP dans n8n
- Testez l'envoi d'email depuis n8n
- Vérifiez les logs email dans Supabase

#### 5. "Callbacks non reçus"
- Vérifiez que l'URL de callback est accessible publiquement
- Vérifiez les logs du webhook `/api/webhooks/n8n-callback`
- Testez l'endpoint manuellement

#### 6. "API send-receipt ne répond pas"
- Vérifiez que l'endpoint est accessible : `curl http://localhost:3000/api/donations/send-receipt`
- Vérifiez les logs Next.js pour erreurs
- Testez avec un transactionId valide

#### 7. "Cache d'idempotence plein"
- Utilisez `DELETE /api/donations/send-receipt?force=true`
- Vérifiez la RAM du serveur (cache en mémoire)
- Considérez Redis en production pour le cache

#### 8. "Transaction non trouvée"
- Vérifiez que l'UUID transaction existe dans la DB
- Vérifiez les permissions Supabase RLS
- Utilisez l'interface de test pour vérifier

### Logs utiles
```bash
# Application Next.js
console.log dans les services

# Supabase
SELECT * FROM n8n_workflow_logs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC;

# n8n
Logs d'exécution dans l'interface n8n

# Gotenberg
docker logs gotenberg
```

## 🔄 Maintenance

### Tâches régulières
1. **Monitoring quotidien** : Vérifier les stats dans `/admin/receipts`
2. **Nettoyage logs** : Supprimer les anciens logs (>6 mois)
3. **Tests périodiques** : Vérifier la chaîne complète
4. **Backup** : Sauvegarder les configurations n8n

### Mises à jour
1. **Application** : Mise à jour normale Next.js
2. **n8n** : Suivre les versions stables
3. **Gotenberg** : Mettre à jour l'image Docker
4. **Templates** : Versionning dans `receipt_template_version`

## 📈 Optimisations

### Performance
- **Batch processing** : Traiter les reçus par lots
- **Caching** : Cache des templates HTML
- **Async** : Traitement asynchrone via n8n
- **Rate limiting** : Limiter les appels API

### Qualité PDF
- **Templates** : Utiliser des CSS print-friendly
- **Images** : Optimiser les logos et images
- **Fonts** : Utiliser des polices web-safe
- **Qualité** : Ajuster les paramètres Gotenberg

---

## 📞 Support

Pour des questions sur cette implémentation :
1. Vérifiez d'abord les logs et la configuration
2. Utilisez les outils de test intégrés
3. Consultez la documentation n8n et Gotenberg
4. Contactez l'équipe technique si nécessaire