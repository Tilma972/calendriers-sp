// src/shared/services/emailService.ts - Service d'envoi d'emails avec SMTP Supabase
import { supabase } from '@/shared/lib/supabase';

interface ReceiptEmailData {
  donatorEmail: string;
  donatorName?: string;
  amount: number;
  calendarsGiven: number;
  paymentMethod: string;
  receiptNumber: string;
  transactionDate: string;
  receiptUrl?: string;
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
   * Génère un numéro de reçu unique
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
   * Génère le template d'email de reçu
   */
  generateReceiptTemplate(data: ReceiptEmailData): EmailTemplate {
    const {
      donatorName,
      amount,
      calendarsGiven,
      paymentMethod,
      receiptNumber,
      transactionDate,
    } = data;

    const formattedDate = new Date(transactionDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const paymentMethodText = {
      especes: 'Espèces',
      cheque: 'Chèque',
      carte: 'Carte bancaire',
      virement: 'Virement'
    }[paymentMethod as keyof typeof paymentMethodText] || paymentMethod;

    const subject = `Reçu de don - ${this.organizationName} - N°${receiptNumber}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reçu de don</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 30px 20px; }
          .receipt-box { border: 2px solid #dc2626; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
          .details { margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 5px 0; }
          .detail-label { font-weight: bold; }
          .footer { background: #f5f5f5; padding: 20px; font-size: 12px; text-align: center; color: #666; }
          .thanks { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🚒 ${this.organizationName}</div>
          <p>Merci pour votre soutien à nos sapeurs-pompiers</p>
        </div>
        
        <div class="content">
          <h2>Reçu de don</h2>
          
          ${donatorName ? `<p>Bonjour ${donatorName},</p>` : '<p>Bonjour,</p>'}
          
          <p>Nous vous remercions chaleureusement pour votre don qui nous permet de continuer notre mission au service de la communauté.</p>
          
          <div class="receipt-box">
            <div class="amount">${amount}€</div>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">N° de reçu :</span>
                <span>${receiptNumber}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Date :</span>
                <span>${formattedDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Montant :</span>
                <span>${amount}€</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Calendriers :</span>
                <span>${calendarsGiven} calendrier${calendarsGiven > 1 ? 's' : ''}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Mode de paiement :</span>
                <span>${paymentMethodText}</span>
              </div>
            </div>
          </div>
          
          <div class="thanks">
            <h3>🙏 Merci pour votre générosité !</h3>
            <p>Votre contribution nous aide à maintenir nos équipements et à assurer notre mission de secours auprès de la population.</p>
          </div>
          
          <p><strong>Important :</strong> Conservez ce reçu comme justificatif de votre don. Il pourra vous être utile pour vos déclarations fiscales si applicable.</p>
        </div>
        
        <div class="footer">
          <p>Ce reçu a été généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.</p>
          <p>${this.organizationName}<br>
          Email: ${this.fromEmail}</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
REÇU DE DON - ${this.organizationName}

${donatorName ? `Bonjour ${donatorName},` : 'Bonjour,'}

Nous vous remercions chaleureusement pour votre don qui nous permet de continuer notre mission au service de la communauté.

DÉTAILS DU DON:
- N° de reçu : ${receiptNumber}
- Date : ${formattedDate}
- Montant : ${amount}€
- Calendriers : ${calendarsGiven} calendrier${calendarsGiven > 1 ? 's' : ''}
- Mode de paiement : ${paymentMethodText}

MERCI POUR VOTRE GÉNÉROSITÉ !
Votre contribution nous aide à maintenir nos équipements et à assurer notre mission de secours auprès de la population.

IMPORTANT : Conservez ce reçu comme justificatif de votre don. Il pourra vous être utile pour vos déclarations fiscales si applicable.

---
Ce reçu a été généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.
${this.organizationName}
Email: ${this.fromEmail}
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Envoie un email de reçu via l'API Supabase Edge Function
   */
  async sendReceiptEmail(data: ReceiptEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Préparation envoi email reçu...', {
        to: data.donatorEmail,
        receiptNumber: data.receiptNumber,
        amount: data.amount
      });

      const template = this.generateReceiptTemplate(data);

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
          }
        }
      });

      if (error) {
        console.error('❌ Erreur envoi email:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email reçu envoyé avec succès:', result);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erreur service email:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
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
   * Processus complet d'envoi de reçu pour une transaction
   */
  async processReceiptForTransaction(transactionId: string): Promise<{ success: boolean; error?: string; receiptNumber?: string }> {
    try {
      // 1. Récupérer les détails de la transaction
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        return { success: false, error: 'Transaction introuvable' };
      }

      // 2. Vérifier si on a un email donateur
      if (!transaction.donator_email) {
        console.log('⚠️ Pas d\'email donateur pour la transaction:', transactionId);
        return { success: false, error: 'Aucun email de donateur fourni' };
      }

      // 3. Générer le numéro de reçu si pas déjà présent
      const receiptNumber = transaction.receipt_number || this.generateReceiptNumber();

      // 4. Préparer les données d'email
      const emailData: ReceiptEmailData = {
        donatorEmail: transaction.donator_email,
        donatorName: transaction.donator_name || undefined,
        amount: transaction.amount,
        calendarsGiven: transaction.calendars_given || 1,
        paymentMethod: transaction.payment_method,
        receiptNumber,
        transactionDate: transaction.created_at || new Date().toISOString(),
      };

      // 5. Envoyer l'email
      const emailResult = await this.sendReceiptEmail(emailData);
      if (!emailResult.success) {
        return { success: false, error: `Erreur envoi email: ${emailResult.error}` };
      }

      // 6. Mettre à jour la transaction avec le numéro de reçu
      const updateResult = await this.updateTransactionReceipt(transactionId, receiptNumber);
      if (!updateResult.success) {
        console.warn('⚠️ Email envoyé mais erreur mise à jour transaction:', updateResult.error);
        // On ne retourne pas d'erreur car l'email a été envoyé
      }

      return { success: true, receiptNumber };

    } catch (error: any) {
      console.error('❌ Erreur processus reçu complet:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }
}

export const emailService = new EmailService();
export default emailService;