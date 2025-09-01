# API Send Receipt - Documentation

API Route sécurisée avec idempotence pour l'envoi de reçus automatiques.

## 🎯 Endpoint Principal

**POST** `/api/donations/send-receipt`

### Payload
```json
{
  "transactionId": "uuid-required",
  "resend": false,
  "donatorInfo": {
    "name": "Jean Dupont (optionnel)",
    "email": "jean@example.com (optionnel si dans transaction)"
  },
  "sapeurInfo": {
    "name": "Pierre Martin (optionnel)"
  },
  "options": {
    "quality": "draft|standard|high (défaut: standard)",
    "sendEmail": true
  }
}
```

### Réponses

#### ✅ Succès
```json
{
  "success": true,
  "receiptNumber": "RECU-2024-01-15-ABC123",
  "emailTo": "jean@example.com",
  "workflowId": "n8n-exec-12345",
  "message": "Reçu envoyé avec succès",
  "estimatedProcessingTime": 3500,
  "quality": "standard",
  "sendEmail": true,
  "transactionId": "uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "fromCache": false
}
```

#### 🔄 Depuis cache (idempotence)
```json
{
  "success": true,
  "receiptNumber": "RECU-2024-01-15-ABC123",
  "fromCache": true,
  "cachedAt": "2024-01-15T10:25:00Z",
  ...
}
```

#### ℹ️ Reçu déjà existant
```json
{
  "success": true,
  "receiptNumber": "RECU-2024-01-15-ABC123",
  "message": "Reçu déjà envoyé précédemment",
  "lastSent": "2024-01-15T09:00:00Z",
  "status": "sent",
  "isExisting": true
}
```

#### ❌ Erreurs courantes
```json
{
  "success": false,
  "error": "Transaction non trouvée",
  "transactionId": "uuid"
}
```

```json
{
  "success": false,
  "error": "Aucun email donateur disponible",
  "suggestion": "Ajoutez donatorInfo.email à votre requête"
}
```

## 🏥 Health Check

**GET** `/api/donations/send-receipt`

```json
{
  "status": "healthy|degraded|error",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "n8nConnection": { "success": true },
    "storage": { "healthy": true },
    "database": true,
    "configuration": { "valid": true }
  },
  "stats": {
    "cache": {
      "size": 42,
      "maxSize": 1000,
      "utilizationPercent": 4
    },
    "email24h": {
      "sent": 156,
      "failed": 2,
      "pending": 0
    },
    "recentTransactions": 45
  }
}
```

## 🧹 Cache Management

**DELETE** `/api/donations/send-receipt`
- Supprime les entrées expirées (>5 min)

**DELETE** `/api/donations/send-receipt?force=true`
- Vide complètement le cache

```json
{
  "success": true,
  "message": "Cache complètement vidé",
  "itemsCleared": 42,
  "remainingItems": 0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔒 Sécurité & Idempotence

### Cache d'idempotence
- Clé : `${transactionId}-${resend}-${quality}`
- Durée : 5 minutes
- Stockage : Mémoire (Map) - considérer Redis en production

### Validation
- **transactionId** : UUID valide requis
- **email** : Format valide requis
- **Transaction** : Doit exister en DB avec profil sapeur

### Gestion d'erreurs
- Logs automatiques dans `email_logs`
- Mise à jour des statuts de transaction
- Détails d'erreur selon environnement

## 📊 Monitoring Intégré

### Logs automatiques
- Chaque requête loggée dans `email_logs`
- Status tracking : `pending` → `sent`/`failed`
- User-agent et metadata conservés

### Métriques
- Statistiques 24h automatiques
- Taux de succès/échec
- Performance cache
- Santé des services externes

## 🚀 Utilisation

### Via Hook React
```typescript
import { useSendReceipt } from '@/shared/hooks/useSendReceipt';

const { sendReceipt, generateTestPDF, checkHealth } = useSendReceipt();

// Envoi standard
const result = await sendReceipt('transaction-id', {
  donatorInfo: { email: 'test@example.com' }
});

// Test PDF uniquement
const pdf = await generateTestPDF('transaction-id');
```

### Via curl
```bash
# Envoi reçu
curl -X POST http://localhost:3000/api/donations/send-receipt \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "uuid", "donatorInfo": {"email": "test@example.com"}}'

# Health check
curl http://localhost:3000/api/donations/send-receipt

# Clear cache
curl -X DELETE http://localhost:3000/api/donations/send-receipt?force=true
```

### Via interface admin
- Accéder à `/admin/receipts`
- Section "Test API Send-Receipt"
- Tester avec transactions réelles ou de test

## ⚡ Performance

### Optimisations
- Cache d'idempotence en mémoire
- Nettoyage automatique du cache
- Validation rapide des paramètres
- Logs asynchrones

### Limites
- Cache : 1000 entrées max
- Timeout : 30s pour n8n
- Rate limiting : À implémenter selon besoins

---

## 🔗 Liens utiles

- [Setup complet](./RECEIPT_SYSTEM_SETUP.md)
- [Interface admin](/admin/receipts)  
- [Logs Supabase](https://supabase.com/dashboard)
- [Configuration n8n](https://n8n.io/docs/)