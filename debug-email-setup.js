// debug-email-setup.js - Script pour diagnostiquer les problèmes d'envoi d'email
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase (remplacez par vos vraies valeurs)
const SUPABASE_URL = 'https://supabase.dsolution-ia.fr';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // À remplacer

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugEmailSetup() {
  console.log('🔍 DIAGNOSTIC EMAIL SETUP');
  console.log('=' .repeat(50));
  
  try {
    // 1. Vérifier si la table email_settings existe et a des données
    console.log('\n1. 📧 Vérification table email_settings...');
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (settingsError) {
      console.error('❌ Erreur récupération email_settings:', settingsError.message);
      
      if (settingsError.code === 'PGRST116') {
        console.log('💡 SOLUTION: La table email_settings est vide. Vous devez créer un enregistrement avec les paramètres SMTP.');
        console.log(`
🔧 SQL à exécuter dans Supabase:
INSERT INTO email_settings (
  id, 
  smtp_host, 
  smtp_port, 
  smtp_user, 
  smtp_password,
  smtp_from_name,
  smtp_from_email,
  association_name,
  association_address
) VALUES (
  1,
  'smtp.gmail.com',  -- ou votre serveur SMTP
  587,
  'votre-email@gmail.com',
  'votre-mot-de-passe-app',  -- mot de passe d'application Gmail
  'Sapeurs-Pompiers Clermont',
  'votre-email@gmail.com',
  'Amicale des Sapeurs-Pompiers',
  '34800 Clermont-l''Hérault'
);`);
        return;
      }
    } else {
      console.log('✅ email_settings trouvées:');
      console.log(`   - smtp_host: ${emailSettings.smtp_host || 'NON CONFIGURÉ'}`);
      console.log(`   - smtp_port: ${emailSettings.smtp_port || 'NON CONFIGURÉ'}`);
      console.log(`   - smtp_user: ${emailSettings.smtp_user ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
      console.log(`   - smtp_password: ${emailSettings.smtp_password ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
      console.log(`   - smtp_from_email: ${emailSettings.smtp_from_email || 'NON CONFIGURÉ'}`);
      
      if (!emailSettings.smtp_host || !emailSettings.smtp_user || !emailSettings.smtp_password) {
        console.log('⚠️ PROBLÈME: Configuration SMTP incomplète!');
        return;
      }
    }

    // 2. Vérifier les transactions avec email pour tester
    console.log('\n2. 🔍 Recherche de transactions avec email...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, donator_email, donator_name, amount, created_at')
      .not('donator_email', 'is', null)
      .limit(3);

    if (txError) {
      console.error('❌ Erreur récupération transactions:', txError.message);
    } else if (!transactions || transactions.length === 0) {
      console.log('⚠️ Aucune transaction avec email trouvée pour tester.');
      console.log('💡 Créez une transaction avec un email pour pouvoir tester l\'envoi de reçu.');
    } else {
      console.log(`✅ ${transactions.length} transaction(s) avec email trouvée(s):`);
      transactions.forEach((tx, i) => {
        console.log(`   ${i+1}. ${tx.donator_name} (${tx.donator_email}) - ${tx.amount}€ - ID: ${tx.id.slice(-8)}`);
      });
    }

    // 3. Vérifier les variables d'environnement Gotenberg
    console.log('\n3. 🖨️ Vérification Gotenberg (génération PDF)...');
    console.log('   Variables d\'environnement nécessaires:');
    console.log(`   - GOTENBERG_URL: ${process.env.GOTENBERG_URL ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
    console.log(`   - GOTENBERG_USERNAME: ${process.env.GOTENBERG_USERNAME ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
    console.log(`   - GOTENBERG_PASSWORD: ${process.env.GOTENBERG_PASSWORD ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
    
    if (!process.env.GOTENBERG_URL) {
      console.log('💡 SOLUTION Gotenberg: Ajoutez ces variables dans votre .env.local:');
      console.log(`
GOTENBERG_URL=https://gotenberg.dsolution-ia.fr
GOTENBERG_USERNAME=votre-username
GOTENBERG_PASSWORD=votre-password`);
    }

    // 4. Vérifier les logs d'email récents
    console.log('\n4. 📋 Vérification logs email récents...');
    const { data: emailLogs, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.error('❌ Erreur récupération email_logs:', logsError.message);
    } else if (!emailLogs || emailLogs.length === 0) {
      console.log('ℹ️ Aucun log email trouvé. Normal si aucun email n\'a été envoyé.');
    } else {
      console.log(`✅ ${emailLogs.length} log(s) email récent(s):`);
      emailLogs.forEach((log, i) => {
        console.log(`   ${i+1}. ${log.email_to} - ${log.status} - ${log.sent_at || log.created_at}`);
        if (log.error_message) {
          console.log(`      ❌ Erreur: ${log.error_message}`);
        }
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎯 RÉSUMÉ DU DIAGNOSTIC:');
    
    if (emailSettings && emailSettings.smtp_host && emailSettings.smtp_user && emailSettings.smtp_password) {
      console.log('✅ Configuration SMTP: OK');
    } else {
      console.log('❌ Configuration SMTP: PROBLÈME - Configurez la table email_settings');
    }
    
    if (process.env.GOTENBERG_URL && process.env.GOTENBERG_USERNAME) {
      console.log('✅ Configuration Gotenberg: OK');
    } else {
      console.log('❌ Configuration Gotenberg: PROBLÈME - Variables d\'environnement manquantes');
    }
    
    if (transactions && transactions.length > 0) {
      console.log('✅ Données de test: OK');
      console.log(`\n💡 POUR TESTER: Utilisez la transaction ID ${transactions[0].id} dans l'interface admin`);
    } else {
      console.log('⚠️ Données de test: Créez une transaction avec email');
    }

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error.message);
  }
}

// Exécuter le diagnostic
debugEmailSetup();