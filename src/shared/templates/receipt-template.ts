// src/shared/templates/receipt-template.ts - Template HTML avancé pour reçus
import { supabase } from '@/shared/lib/supabase';

export interface ReceiptData {
  receiptNumber: string;
  donationDate: string;
  donatorName: string;
  donatorEmail: string;
  amount: number;
  calendarsGiven: number;
  paymentMethod: string;
  sapeurName: string; // Nom du sapeur qui a collecté
  teamName?: string; // Nom de l'équipe
  // Coordonnées légales complètes
  associationName: string;
  associationAddress: string;
  associationSiren?: string;
  associationRNA?: string; // Numéro RNA/W préfecture
  legalText: string;
  enableTracking?: boolean;
}

export interface EmailSettings {
  smtp_from_name: string;
  smtp_from_email: string;
  association_name: string;
  association_address: string;
  association_siren?: string;
  association_rna?: string;
  legal_text: string;
  enable_tracking: boolean;
  template_version: string;
}

export class ReceiptTemplateService {
  
  /**
   * Récupère la configuration email depuis la base
   */
  static async getEmailSettings(): Promise<EmailSettings> {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      // Configuration par défaut en cas d'erreur
      return {
        smtp_from_name: 'Sapeurs-Pompiers Calendriers 2025',
        smtp_from_email: 'no-reply@pompiers34800.com',
        association_name: 'Amicale des Sapeurs-Pompiers',
        association_address: 'Adresse à compléter dans les paramètres',
        legal_text: 'Ce reçu vous est délivré à des fins comptables et justificatives. Conservez-le précieusement.',
        enable_tracking: false,
        template_version: 'v1'
      };
    }

    return data;
  }

  /**
   * Génère l'HTML du reçu avec design émotionnel
   */
  static generateReceiptHTML(data: ReceiptData): string {
    const paymentMethodLabels = {
      'especes': '💵 Espèces',
      'cheque': '📝 Chèque',
      'carte': '💳 Carte bancaire',
      'virement': '🏦 Virement'
    };

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const trackingPixel = data.enableTracking ? 
      `<img src="${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/track-email-open?receipt=${data.receiptNumber}" width="1" height="1" style="display:none;" alt="" />` : 
      '';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu de don - ${data.receiptNumber}</title>
  <style>
    /* Reset et base */
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      margin: 0; 
      padding: 20px; 
      background: #f8fafc;
      color: #334155;
    }
    
    .container { 
      max-width: 700px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    /* Header avec gradient sapeurs-pompiers */
    .header { 
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #7f1d1d 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="flames" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M10,20 Q5,10 10,0 Q15,10 10,20" fill="rgba(255,255,255,0.03)"/></pattern></defs><rect width="100" height="100" fill="url(%23flames)"/></svg>');
      opacity: 0.1;
    }
    
    .logo-section {
      position: relative;
      z-index: 2;
    }
    .logo-placeholder { 
      width: 100px; 
      height: 100px; 
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      margin: 0 auto 20px; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      border-radius: 50%;
      text-align: center;
      border: 3px solid rgba(255,255,255,0.3);
    }
    .receipt-title { 
      font-size: 32px; 
      font-weight: 800; 
      margin: 15px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .receipt-subtitle {
      font-size: 18px;
      opacity: 0.9;
      font-weight: 300;
      margin-bottom: 20px;
    }
    .association-info { 
      font-size: 14px; 
      line-height: 1.5;
      opacity: 0.95;
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 8px;
      backdrop-filter: blur(5px);
    }
    
    /* Section de remerciement émotionnelle */
    .thank-you-section {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .thank-you-section::before {
      content: '🙏';
      font-size: 60px;
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0.1;
    }
    
    .thank-you-text {
      font-size: 26px;
      color: #dc2626;
      font-weight: 700;
      margin-bottom: 20px;
      position: relative;
      z-index: 2;
    }
    .personalized-message {
      font-size: 18px;
      color: #374151;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .impact-message {
      color: #6b7280;
      font-style: italic;
      line-height: 1.7;
      max-width: 500px;
      margin: 0 auto;
      font-size: 16px;
    }
    .impact-highlight {
      background: linear-gradient(120deg, #fbbf24, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
    }
    
    /* Détails du don avec style moderne */
    .donation-details {
      margin: 0;
      background: white;
    }
    .details-header {
      background: linear-gradient(90deg, #374151, #4b5563);
      color: white;
      padding: 20px 30px;
      font-weight: 600;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .details-header::before {
      content: '📋';
      font-size: 20px;
    }
    
    .details-grid {
      padding: 30px;
      display: grid;
      gap: 20px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
    }
    .detail-value {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
      font-size: 15px;
    }
    
    /* Mise en avant du montant */
    .amount-row {
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border-radius: 12px;
      padding: 20px !important;
      border: 2px solid #10b981 !important;
      margin: 10px 0;
    }
    .amount-value {
      font-size: 32px !important;
      font-weight: 800 !important;
      color: #047857 !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    /* Section impact avec témoignage */
    .impact-section {
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      padding: 30px;
      border-left: 5px solid #3b82f6;
      margin: 0;
    }
    .impact-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .impact-testimonial {
      font-style: italic;
      color: #1e40af;
      font-size: 16px;
      line-height: 1.6;
      position: relative;
      padding-left: 20px;
    }
    .impact-testimonial::before {
      content: '"';
      font-size: 48px;
      position: absolute;
      left: -10px;
      top: -10px;
      color: #3b82f6;
      opacity: 0.3;
    }
    
    /* Section légale moderne */
    .legal-section {
      padding: 30px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .legal-title {
      font-weight: 700;
      color: #334155;
      margin-bottom: 15px;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legal-title::before {
      content: '⚖️';
      font-size: 18px;
    }
    .legal-info {
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
    }
    .tax-info {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
    }
    .tax-info-title {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 5px;
      font-size: 14px;
    }
    .tax-info-text {
      color: #92400e;
      font-size: 12px;
      line-height: 1.5;
    }
    
    /* Footer */
    .footer {
      padding: 30px;
      text-align: center;
      background: linear-gradient(135deg, #1e293b, #334155);
      color: #e2e8f0;
    }
    .footer-links {
      margin-bottom: 20px;
      font-size: 14px;
    }
    .footer-links a {
      color: #94a3b8;
      text-decoration: none;
      margin: 0 15px;
    }
    .footer-links a:hover {
      color: #f1f5f9;
    }
    .generated-info {
      font-size: 11px;
      opacity: 0.7;
      font-style: italic;
    }
    
    /* Responsive */
    @media (max-width: 600px) {
      body { padding: 10px; }
      .container { border-radius: 0; margin: 0; }
      .header { padding: 30px 20px; }
      .details-grid { padding: 20px; }
      .thank-you-section { padding: 30px 20px; }
      .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
      .detail-value { text-align: left; }
    }
  </style>
</head>
<body>
  ${trackingPixel}
  
  <div class="container">
    <div class="header">
      <div class="logo-section">
        <div class="logo-placeholder">
          🚒<br>SAPEURS<br>POMPIERS
        </div>
        <div class="receipt-title">Reçu de Don</div>
        <div class="receipt-subtitle">Merci pour votre générosité</div>
        <div class="association-info">
          <strong>${data.associationName}</strong><br>
          ${data.associationAddress}
          ${data.associationSiren ? `<br>SIREN: ${data.associationSiren}` : ''}
          ${data.associationRNA ? `<br>N° RNA: ${data.associationRNA}` : ''}
        </div>
      </div>
    </div>
    
    <div class="thank-you-section">
      <div class="thank-you-text">
        Merci infiniment ${data.donatorName} ! 
      </div>
      <div class="personalized-message">
        Votre don de <strong>${data.amount}€</strong> fait une vraie différence
      </div>
      <div class="impact-message">
        Grâce à votre <span class="impact-highlight">générosité exceptionnelle</span>, nos équipes peuvent continuer leur mission vitale de protection et de secours. Chaque euro compte pour l'achat d'équipements de pointe, la formation continue de nos sapeurs-pompiers, et le maintien de nos véhicules de secours.
      </div>
    </div>

    <div class="donation-details">
      <div class="details-header">
        Détails de votre contribution
      </div>
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">👤 Donateur</span>
          <span class="detail-value">${data.donatorName}</span>
        </div>
        
        <div class="detail-row amount-row">
          <span class="detail-label">💰 Montant du don</span>
          <span class="detail-value amount-value">${data.amount}€</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">📅 Date du don</span>
          <span class="detail-value">${formatDate(data.donationDate)} à ${formatTime(data.donationDate)}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">💳 Mode de paiement</span>
          <span class="detail-value">${paymentMethodLabels[data.paymentMethod] || data.paymentMethod}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">📖 Calendriers remis</span>
          <span class="detail-value">${data.calendarsGiven} calendrier${data.calendarsGiven > 1 ? 's' : ''}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">🚒 Sapeur-Pompier</span>
          <span class="detail-value">${data.sapeurName}${data.teamName ? ` (${data.teamName})` : ''}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">📄 N° de reçu</span>
          <span class="detail-value"><strong>${data.receiptNumber}</strong></span>
        </div>
      </div>
    </div>
    
    <div class="impact-section">
      <div class="impact-title">
        🌟 L'impact de votre don
      </div>
      <div class="impact-testimonial">
        Votre soutien est essentiel pour la vie de notre amicale. Grâce à vous, nous améliorons le quotidien de nos sapeurs-pompiers et renforçons la cohésion de nos équipes qui se dévouent chaque jour pour votre sécurité. Votre geste solidaire nous permet de continuer à servir la communauté avec les meilleurs équipements.
      </div>
    </div>
    
    <div class="legal-section">
      <div class="legal-title">Informations légales</div>
      <div class="legal-info">
        ${data.legalText}
        <br><br>
        En cas d'erreur sur ce reçu, veuillez nous contacter dans les meilleurs délais à ${data.associationName}.
      </div>
      
      ${data.associationRNA ? `
      <div class="tax-info">
        <div class="tax-info-title">🏛️ Avantage fiscal</div>
        <div class="tax-info-text">
          Cet organisme est habilité à recevoir des dons ouvrant droit à réduction d'impôt. 
          Conservez ce reçu pour votre déclaration fiscale.
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <div class="footer-links">
        <span>📧 ${data.associationName}</span>
      </div>
      <div class="generated-info">
        Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}<br>
        Si vous n'êtes pas le destinataire, veuillez ignorer et supprimer cet email.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Génère la version texte du reçu
   */
  static generateReceiptText(data: ReceiptData): string {
    const paymentMethodLabels = {
      'especes': 'Espèces',
      'cheque': 'Chèque', 
      'carte': 'Carte bancaire',
      'virement': 'Virement'
    };

    return `
REÇU DE DON - ${data.associationName}

Merci ${data.donatorName} pour votre générosité !

═══════════════════════════════════════════════
DÉTAILS DE VOTRE DON
═══════════════════════════════════════════════

Donateur      : ${data.donatorName}
Montant       : ${data.amount}€
Date          : ${new Date(data.donationDate).toLocaleDateString('fr-FR')}
Paiement      : ${paymentMethodLabels[data.paymentMethod] || data.paymentMethod}
Calendriers   : ${data.calendarsGiven} calendrier${data.calendarsGiven > 1 ? 's' : ''}
Sapeur-Pompier: ${data.sapeurName}${data.teamName ? ` (${data.teamName})` : ''}
N° de reçu    : ${data.receiptNumber}

═══════════════════════════════════════════════
IMPACT DE VOTRE DON
═══════════════════════════════════════════════

Votre soutien est essentiel pour la vie de notre amicale. 
Grâce à vous, nous améliorons le quotidien de nos sapeurs-pompiers 
et renforçons la cohésion de nos équipes qui se dévouent chaque jour 
pour votre sécurité.

═══════════════════════════════════════════════
INFORMATIONS LÉGALES
═══════════════════════════════════════════════

${data.legalText}

${data.associationName}
${data.associationAddress}
${data.associationSiren ? `SIREN: ${data.associationSiren}` : ''}
${data.associationRNA ? `N° RNA: ${data.associationRNA}` : ''}

${data.associationRNA ? '🏛️ Cet organisme est habilité à recevoir des dons ouvrant droit à réduction d\'impôt.' : ''}

═══════════════════════════════════════════════

Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}
Si vous n'êtes pas le destinataire, veuillez ignorer cet email.

${data.associationName} - Merci pour votre confiance !
    `.trim();
  }
}

export default ReceiptTemplateService;