// src/shared/services/emailService.test.ts - Tests unitaires pour le service email
import { emailService } from './emailService';

// Mock de Supabase pour les tests
jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

describe('EmailService', () => {
  describe('generateReceiptNumber', () => {
    it('should generate a unique receipt number with correct format', () => {
      const receiptNumber = emailService.generateReceiptNumber();
      
      // Format: SP-YYYYMMDD-XXXXXX
      expect(receiptNumber).toMatch(/^SP-\d{8}-\d{6}$/);
      expect(receiptNumber).toContain('SP-');
      expect(receiptNumber).toContain(new Date().getFullYear().toString());
    });

    it('should generate different numbers on consecutive calls', () => {
      const receipt1 = emailService.generateReceiptNumber();
      const receipt2 = emailService.generateReceiptNumber();
      
      expect(receipt1).not.toBe(receipt2);
    });
  });

  describe('generateReceiptTemplate', () => {
    it('should generate proper email template with all data', () => {
      const testData = {
        donatorEmail: 'test@exemple.com',
        donatorName: 'Jean Dupont',
        amount: 25,
        calendarsGiven: 2,
        paymentMethod: 'especes',
        receiptNumber: 'SP-20241201-123456',
        transactionDate: '2024-12-01T10:30:00Z'
      };

      const template = emailService.generateReceiptTemplate(testData);

      // Vérifier les éléments du template
      expect(template.subject).toContain('SP-20241201-123456');
      expect(template.subject).toContain('Sapeurs-Pompiers');
      
      expect(template.htmlBody).toContain('Jean Dupont');
      expect(template.htmlBody).toContain('25€');
      expect(template.htmlBody).toContain('2 calendriers');
      expect(template.htmlBody).toContain('SP-20241201-123456');
      expect(template.htmlBody).toContain('Espèces');
      
      expect(template.textBody).toContain('Jean Dupont');
      expect(template.textBody).toContain('25€');
      expect(template.textBody).toContain('2 calendriers');
    });

    it('should handle missing donator name gracefully', () => {
      const testData = {
        donatorEmail: 'test@exemple.com',
        amount: 10,
        calendarsGiven: 1,
        paymentMethod: 'carte',
        receiptNumber: 'SP-20241201-123456',
        transactionDate: '2024-12-01T10:30:00Z'
      };

      const template = emailService.generateReceiptTemplate(testData);

      expect(template.htmlBody).toContain('Bonjour,');
      expect(template.htmlBody).not.toContain('undefined');
      expect(template.textBody).toContain('Bonjour,');
    });

    it('should format payment methods correctly', () => {
      const methods = [
        { input: 'especes', expected: 'Espèces' },
        { input: 'cheque', expected: 'Chèque' },
        { input: 'carte', expected: 'Carte bancaire' },
        { input: 'virement', expected: 'Virement' }
      ];

      methods.forEach(({ input, expected }) => {
        const testData = {
          donatorEmail: 'test@exemple.com',
          amount: 10,
          calendarsGiven: 1,
          paymentMethod: input,
          receiptNumber: 'SP-20241201-123456',
          transactionDate: '2024-12-01T10:30:00Z'
        };

        const template = emailService.generateReceiptTemplate(testData);
        expect(template.htmlBody).toContain(expected);
      });
    });

    it('should handle singular/plural calendars correctly', () => {
      // Test singulier
      const testSingular = {
        donatorEmail: 'test@exemple.com',
        amount: 10,
        calendarsGiven: 1,
        paymentMethod: 'especes',
        receiptNumber: 'SP-20241201-123456',
        transactionDate: '2024-12-01T10:30:00Z'
      };

      const templateSingular = emailService.generateReceiptTemplate(testSingular);
      expect(templateSingular.htmlBody).toContain('1 calendrier</span>');
      expect(templateSingular.htmlBody).not.toContain('calendriers');

      // Test pluriel
      const testPlural = {
        ...testSingular,
        calendarsGiven: 3
      };

      const templatePlural = emailService.generateReceiptTemplate(testPlural);
      expect(templatePlural.htmlBody).toContain('3 calendriers</span>');
    });
  });
});

// Helper pour exporter le service en mode test
export { emailService };