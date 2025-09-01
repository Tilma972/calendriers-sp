# 📧 Système de Reçus Automatiques - Documentation

## 🎯 Vue d'ensemble

Le système de reçus automatiques permet d'envoyer automatiquement par email un reçu de don à chaque donateur qui fournit son adresse email lors de la transaction. Ce système s'intègre parfaitement à l'application existante sans casser le flux actuel.

## ✨ Fonctionnalités

### ✅ Envoi automatique
- **Déclenchement** : Lors de chaque transaction avec email donateur
- **Contenu** : Reçu HTML + texte avec toutes les informations du don
- **Numérotation** : Numéro de reçu unique `SP-AAAAMMJJ-XXXXXX`
- **Intégration** : Aucune interruption du flux utilisateur

### ✅ Interface d'administration
- **Page dédiée** : `/admin/receipts` pour gérer les reçus
- **Filtrage** : Par statut d'email et de reçu
- **Renvoi manuel** : Possibilité de renvoyer des reçus
- **Historique** : Suivi complet des reçus envoyés

### ✅ Formulaire amélioré
- **Champ email** : Ajouté avec indication claire du reçu automatique
- **UX optimisée** : Feedback visuel de l'envoi en cours
- **Mobile-first** : Interface adaptée aux smartphones

## 🏗️ Architecture technique

### Services créés

```
src/shared/services/
└── emailService.ts          # Service principal d'envoi d'emails
supabase/functions/
└── send-receipt-email/       # Edge Function Supabase pour SMTP
    └── index.ts
src/app/admin/receipts/       # Interface admin de gestion
└── page.tsx
```

### Flux de données

```
1. Transaction créée avec email donateur
   ↓
2. emailService.processReceiptForTransaction()
   ↓
3. Génération template HTML + texte
   ↓
4. Appel Supabase Edge Function
   ↓
5. Envoi SMTP via configuration existante
   ↓
6. Mise à jour transaction avec receipt_number
   ↓
7. Feedback utilisateur
```

## 🔧 Configuration requise

### Variables d'environnement
Aucune nouvelle variable requise ! Le système utilise la configuration SMTP existante de Supabase.

### Base de données
Les champs suivants étaient déjà présents dans la table `transactions` :
- `donator_email` (string | null)
- `donator_name` (string | null) 
- `receipt_number` (string | null)
- `receipt_url` (string | null)

### Déploiement Supabase Edge Function

```bash
# Déployer la fonction d'envoi d'email
supabase functions deploy send-receipt-email
```

## 📋 Utilisation

### Pour les sapeurs-pompiers (utilisateurs finaux)

1. **Collecte de don standard** :
   - Remplir le formulaire comme d'habitude
   - **Nouveau** : Ajouter l'email du donateur (optionnel)
   - Le reçu est envoyé automatiquement si email fourni

2. **Feedback immédiat** :
   - ✅ "Don enregistré ! Reçu envoyé à email@exemple.com"
   - ⚠️ "Don enregistré ! (Erreur envoi email)" si problème SMTP

### Pour les administrateurs

1. **Accéder à la gestion** :
   - Menu Admin → 📧 Reçus
   - Filtrer par statut : "Avec email", "Sans reçu envoyé", etc.

2. **Actions disponibles** :
   - 📧 Envoyer reçu : Pour nouvelles transactions
   - 🔄 Renvoyer : Pour reçus déjà envoyés
   - Voir historique complet

## 🔍 Templates de reçus

### Informations incluses
- **Identité** : Nom donateur (si fourni)
- **Montant** : Somme donnée en euros
- **Détails** : Nombre de calendriers, mode de paiement
- **Reçu** : Numéro unique, date de génération
- **Organisation** : Logo, nom, contact Sapeurs-Pompiers

### Format
- **HTML** : Template moderne avec CSS inline, responsive
- **Texte** : Version plain text pour compatibilité
- **Branding** : Couleurs rouge/blanc aux couleurs des pompiers

## 🔒 Sécurité

### Validation des données
- ✅ Vérification email valide côté client
- ✅ Sanitisation des inputs
- ✅ Protection contre l'injection

### Permissions
- ✅ Page admin réservée aux chefs d'équipe et trésoriers
- ✅ Pas d'exposition d'emails sensibles
- ✅ Logs sécurisés côté serveur

### RGPD/Confidentialité
- ✅ Emails stockés avec consentement implicite (don volontaire)
- ✅ Pas de transmission à des tiers
- ✅ Utilisation limitée aux reçus de don

## 🧪 Tests

### Tests unitaires
```bash
npm test src/shared/services/emailService.test.ts
```

### Tests manuels
1. Créer transaction avec email → Vérifier reçu envoyé
2. Créer transaction sans email → Pas d'envoi
3. Tester renvoi depuis interface admin
4. Vérifier génération numéro de reçu unique

## 🛠️ Maintenance

### Monitoring
- **Logs** : Console Supabase Edge Functions
- **Erreurs** : Remontées dans interface admin
- **Stats** : Comptage reçus envoyés vs transactions

### Configuration SMTP
Le système utilise la configuration SMTP existante dans le docker-compose de Supabase :
```yaml
SMTP_HOST: "votre-serveur-smtp"
SMTP_PORT: "587"
SMTP_USER: "no-reply@pompiers34800.com"
SMTP_PASSWORD: "votre-mot-de-passe"
```

## 🚀 Déploiement en production

### Checklist pré-déploiement

- [ ] ✅ Variables SMTP configurées dans Supabase
- [ ] ✅ Edge Function déployée : `send-receipt-email`
- [ ] ✅ Tests envoi email depuis staging
- [ ] ✅ Validation template reçu
- [ ] ✅ Permissions admin configurées

### Rollback plan

En cas de problème, le système est conçu pour **ne jamais casser l'existant** :

1. **Erreur SMTP** → Transaction sauvée, message d'erreur discret
2. **Bug service** → Mode dégradé automatique, pas de reçu mais don enregistré
3. **Rollback complet** → Supprimer import emailService, system fonctionne comme avant

## 📞 Support

### Problèmes fréquents

**Q: Les emails ne partent pas**
R: Vérifier la configuration SMTP dans Supabase → Paramètres → Auth → SMTP

**Q: Les reçus arrivent en spam**
R: Configurer SPF/DKIM pour le domaine pompiers34800.com

**Q: Erreur "Edge Function timeout"**  
R: Vérifier la connectivité réseau, augmenter timeout si nécessaire

### Contact technique
- **Logs Supabase** : Dashboard → Edge Functions → send-receipt-email
- **Erreurs frontend** : Console navigateur
- **Base de données** : Table transactions, colonnes receipt_*

---

## 🎉 Résultat final

### Avant
❌ Pas de trace numérique des dons  
❌ Pas de reçu pour le donateur  
❌ Gestion manuelle fastidieuse  

### Après
✅ Reçu automatique à chaque don  
✅ Numérotation unique et traçable  
✅ Interface admin complète  
✅ UX améliorée pour les sapeurs-pompiers  
✅ Satisfaction donateurs ++  

**Le système fonctionne de manière transparente et n'impacte pas le flux existant tout en ajoutant une valeur énorme pour l'organisation !** 🚒🔥