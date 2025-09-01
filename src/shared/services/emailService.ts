// src/shared/services/emailService.ts - Service d'envoi d'emails avec SMTP Supabase
import { supabase } from '@/shared/lib/supabase';
import { ReceiptTemplateService, type ReceiptData } from '@/shared/templates/receipt-template';
import { EmailLogService, ReceiptStorageService, type EmailLogData } from '@/shared/services/storageService';

// Interface pour les données de reçu (étendue)
interface ReceiptEmailDataExtended {
  donatorEmail: string;
  donatorName?: string;
  amount: number;
  calendarsGiven: number;
  paymentMethod: string;
  receiptNumber: string;
  transactionDate: string;
  receiptUrl?: string;
  sapeurName: string; // Nom du sapeur collecteur
  teamName?: string; // Nom de l'équipe
}

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

class EmailService {
  private readonly fromEmail = 'no-reply@pompiers34800.com';
  private readonly organizationName = 'Sapeurs-Pompiers Calendriers 2025';

  /**
   * Génère un numéro de reçu unique amélioré
   */
  generateReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6); // Derniers 6 chiffres
    
    return `SP-${year}${month}${day}-${timestamp}`;
  }

  /**
   * Génère le template d'email avec le nouveau système
   */
  async generateReceiptTemplate(data: ReceiptEmailDataExtended): Promise<EmailTemplate> {
    try {
      // Récupérer les paramètres email
      const settings = await ReceiptTemplateService.getEmailSettings();
      
      // Préparer les données pour le template
      const receiptData: ReceiptData = {
        receiptNumber: data.receiptNumber,
        donationDate: data.transactionDate,
        donatorName: data.donatorName || 'Donateur anonyme',
        donatorEmail: data.donatorEmail,
        amount: data.amount,
        calendarsGiven: data.calendarsGiven,
        paymentMethod: data.paymentMethod,
        sapeurName: data.sapeurName,
        teamName: data.teamName,
        associationName: settings.association_name,
        associationAddress: settings.association_address,
        associationSiren: settings.association_siren,
        associationRNA: settings.association_rna,
        legalText: settings.legal_text,
        enableTracking: settings.enable_tracking
      };

      // Générer HTML et texte avec le nouveau template
      const htmlBody = ReceiptTemplateService.generateReceiptHTML(receiptData);
      const textBody = ReceiptTemplateService.generateReceiptText(receiptData);
      
      const subject = `Reçu de don - ${settings.association_name} - N°${data.receiptNumber}`;

      return { subject, htmlBody, textBody };
      
    } catch (error) {
      console.error('Erreur génération template:', error);
      // Fallback vers l'ancien système en cas d'erreur
      return this.generateBasicTemplate(data);
    }
  }

  /**
   * Fallback vers l'ancien template en cas d'erreur
   */
  private generateBasicTemplate(data: ReceiptEmailDataExtended): EmailTemplate {
    const subject = `Reçu de don - ${this.organizationName} - N°${data.receiptNumber}`;
    
    const htmlBody = `
      <h1>Reçu de don</h1>
      <p>Merci ${data.donatorName || ''} pour votre don de ${data.amount}€</p>
      <p>N° de reçu: ${data.receiptNumber}</p>
      <p>Calendriers: ${data.calendarsGiven}</p>
      <p>Sapeur-Pompier: ${data.sapeurName}</p>
    `;
    
    const textBody = `
      Reçu de don
      Merci ${data.donatorName || ''} pour votre don de ${data.amount}€
      N° de reçu: ${data.receiptNumber}
      Calendriers: ${data.calendarsGiven}
      Sapeur-Pompier: ${data.sapeurName}
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Envoie un email de reçu via l'API Supabase Edge Function avec logging complet
   */
  async sendReceiptEmail(
    data: ReceiptEmailDataExtended, 
    transactionId: string
  ): Promise<{ success: boolean; error?: string; logId?: string }> {
    let logId: string | undefined;
    
    try {
      console.log('📧 Préparation envoi email reçu...', {
        to: data.donatorEmail,
        receiptNumber: data.receiptNumber,
        amount: data.amount,
        sapeur: data.sapeurName
      });

      // Générer le template avec le nouveau système
      const template = await this.generateReceiptTemplate(data);

      // Créer le log initial
      const logResult = await EmailLogService.createEmailLog({
        transactionId,
        emailTo: data.donatorEmail,
        subject: template.subject,
        status: 'pending',
        receiptNumber: data.receiptNumber
      });
      
      if (logResult.success && logResult.id) {
        logId = logResult.id;
      }

      // Archiver le HTML (optionnel pour traçabilité)
      try {
        await ReceiptStorageService.uploadReceiptHTML(template.htmlBody, data.receiptNumber);
      } catch (storageError) {
        console.warn('⚠️ Erreur archivage HTML:', storageError);
        // Non bloquant
      }

      // Utilisation de l'API Supabase Edge Function pour l'envoi d'email
      const { data: result, error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          to: data.donatorEmail,
          from: this.fromEmail,
          subject: template.subject,
          html: template.htmlBody,
          text: template.textBody,
          receiptData: {
            receiptNumber: data.receiptNumber,
            amount: data.amount,
            donatorName: data.donatorName,
            sapeurName: data.sapeurName,
            transactionId
          }
        }
      });

      if (error) {
        console.error('❌ Erreur envoi email:', error);
        
        // Mettre à jour le log avec l'erreur
        if (logId) {
          await EmailLogService.updateEmailLog(logId, {
            status: 'failed',
            errorMessage: error.message
          });
        }
        
        return { success: false, error: error.message, logId };
      }

      console.log('✅ Email reçu envoyé avec succès:', result);
      
      // Mettre à jour le log avec le succès
      if (logId) {
        await EmailLogService.updateEmailLog(logId, {
          status: 'sent'
        });
      }

      return { success: true, logId };

    } catch (error: any) {
      console.error('❌ Erreur service email:', error);
      
      // Mettre à jour le log avec l'erreur
      if (logId) {
        await EmailLogService.updateEmailLog(logId, {
          status: 'failed',
          errorMessage: error.message || 'Erreur inconnue'
        });
      }
      
      return { success: false, error: error.message || 'Erreur inconnue', logId };
    }
  }

  /**
   * Met à jour la transaction avec les informations de reçu
   */
  async updateTransactionReceipt(
    transactionId: string, 
    receiptNumber: string, 
    receiptUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          receipt_number: receiptNumber,
          receipt_url: receiptUrl,
        })
        .eq('id', transactionId);

      if (error) {
        console.error('❌ Erreur mise à jour transaction:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Transaction mise à jour avec reçu:', { transactionId, receiptNumber });
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erreur update transaction:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }

  /**
   * Processus complet d'envoi de reçu pour une transaction avec informations enrichies
   */
  async processReceiptForTransaction(transactionId: string): Promise<{ success: boolean; error?: string; receiptNumber?: string; logId?: string }> {
    try {
      // 1. Récupérer les détails de la transaction avec les infos sapeur et équipe
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles!transactions_user_id_fkey (
            id,
            full_name,
            team_id,
            teams (
              name
            )
          )
        `)
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        console.error('Erreur récupération transaction:', fetchError);
        return { success: false, error: 'Transaction introuvable' };
      }

      // 2. Vérifier si on a un email donateur
      if (!transaction.donator_email) {
        console.log('⚠️ Pas d\'email donateur pour la transaction:', transactionId);
        return { success: false, error: 'Aucun email de donateur fourni' };
      }

      // 3. Extraire les informations du sapeur et de l'équipe
      const sapeurProfile = transaction.profiles;
      const sapeurName = sapeurProfile?.full_name || 'Sapeur-Pompier';
      const teamName = sapeurProfile?.teams?.name;

      // 4. Générer le numéro de reçu si pas déjà présent
      const receiptNumber = transaction.receipt_number || this.generateReceiptNumber();

      // 5. Préparer les données d'email avec toutes les informations
      const emailData: ReceiptEmailDataExtended = {
        donatorEmail: transaction.donator_email,
        donatorName: transaction.donator_name || undefined,
        amount: transaction.amount,
        calendarsGiven: transaction.calendars_given || 1,
        paymentMethod: transaction.payment_method,
        receiptNumber,
        transactionDate: transaction.created_at || new Date().toISOString(),
        sapeurName,
        teamName
      };

      // 6. Envoyer l'email avec logging
      const emailResult = await this.sendReceiptEmail(emailData, transactionId);
      if (!emailResult.success) {
        return { 
          success: false, 
          error: `Erreur envoi email: ${emailResult.error}`,
          logId: emailResult.logId 
        };
      }

      // 7. Mettre à jour la transaction avec le numéro de reçu
      const updateResult = await this.updateTransactionReceipt(transactionId, receiptNumber);
      if (!updateResult.success) {
        console.warn('⚠️ Email envoyé mais erreur mise à jour transaction:', updateResult.error);
        // On ne retourne pas d'erreur car l'email a été envoyé
      }

      return { 
        success: true, 
        receiptNumber,
        logId: emailResult.logId 
      };

    } catch (error: any) {
      console.error('❌ Erreur processus reçu complet:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }
}

export const emailService = new EmailService();
export default emailService;