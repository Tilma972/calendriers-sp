// src/shared/services/emailService.v2.test.ts - Tests pour le système v2
import { ReceiptTemplateService } from '../templates/receipt-template';
import { EmailLogService, ReceiptStorageService } from './storageService';

// Mock Supabase
jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn()
          })),
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        lt: jest.fn()
      }))
    })),
    storage: {
      createBucket: jest.fn(),
      listBuckets: jest.fn(),
      from: jest.fn(() => ({
        upload: jest.fn(),
        createSignedUrl: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn()
      }))
    },
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('ReceiptTemplateService V2', () => {
  describe('getEmailSettings', () => {
    it('should return default settings when database fails', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const settings = await ReceiptTemplateService.getEmailSettings();
      
      expect(settings).toEqual({
        smtp_from_name: 'Sapeurs-Pompiers Calendriers 2025',
        smtp_from_email: 'no-reply@pompiers34800.com',
        association_name: 'Amicale des Sapeurs-Pompiers',
        association_address: 'Adresse à compléter dans les paramètres',
        legal_text: 'Ce reçu vous est délivré à des fins comptables et justificatives. Conservez-le précieusement.',
        enable_tracking: false,
        template_version: 'v1'
      });
    });

    it('should return database settings when available', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      const mockSettings = {
        smtp_from_name: 'Sapeurs-Pompiers Test',
        smtp_from_email: 'test@pompiers.com',
        association_name: 'Test Association',
        association_address: '123 Test Street',
        association_siren: '123456789',
        association_rna: 'W123456789',
        legal_text: 'Test legal text',
        enable_tracking: true,
        template_version: 'v2'
      };
      
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockSettings,
        error: null
      });

      const settings = await ReceiptTemplateService.getEmailSettings();
      expect(settings).toEqual(mockSettings);
    });
  });

  describe('generateReceiptHTML', () => {
    it('should generate complete HTML with all data', () => {
      const testData = {
        receiptNumber: 'SP-20241201-123456',
        donationDate: '2024-12-01T10:30:00Z',
        donatorName: 'Jean Dupont',
        donatorEmail: 'jean@exemple.com',
        amount: 25,
        calendarsGiven: 2,
        paymentMethod: 'especes',
        sapeurName: 'Pierre Martin',
        teamName: 'Équipe Alpha',
        associationName: 'Test Association',
        associationAddress: '123 Test Street',
        associationSiren: '123456789',
        associationRNA: 'W123456789',
        legalText: 'Test legal text',
        enableTracking: true
      };

      const html = ReceiptTemplateService.generateReceiptHTML(testData);
      
      // Vérifications essentielles
      expect(html).toContain('Jean Dupont');
      expect(html).toContain('25€');
      expect(html).toContain('2 calendriers');
      expect(html).toContain('Pierre Martin');
      expect(html).toContain('Équipe Alpha');
      expect(html).toContain('SP-20241201-123456');
      expect(html).toContain('💵 Espèces');
      expect(html).toContain('Test Association');
      expect(html).toContain('SIREN: 123456789');
      expect(html).toContain('N° RNA: W123456789');
      
      // Vérification tracking pixel
      expect(html).toContain('track-email-open?receipt=SP-20241201-123456');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData = {
        receiptNumber: 'SP-20241201-123456',
        donationDate: '2024-12-01T10:30:00Z',
        donatorName: 'Jean Dupont',
        donatorEmail: 'jean@exemple.com',
        amount: 10,
        calendarsGiven: 1,
        paymentMethod: 'carte',
        sapeurName: 'Pierre Martin',
        associationName: 'Test Association',
        associationAddress: '123 Test Street',
        legalText: 'Test legal text',
        enableTracking: false
      };

      const html = ReceiptTemplateService.generateReceiptHTML(minimalData);
      
      expect(html).toContain('Jean Dupont');
      expect(html).toContain('1 calendrier</span>'); // Pas de 's'
      expect(html).toContain('💳 Carte bancaire');
      expect(html).not.toContain('track-email-open'); // Pas de tracking
      expect(html).not.toContain('SIREN:'); // Pas de SIREN
      expect(html).not.toContain('N° RNA:'); // Pas de RNA
    });
  });

  describe('generateReceiptText', () => {
    it('should generate proper text version', () => {
      const testData = {
        receiptNumber: 'SP-20241201-123456',
        donationDate: '2024-12-01T10:30:00Z',
        donatorName: 'Jean Dupont',
        donatorEmail: 'jean@exemple.com',
        amount: 25,
        calendarsGiven: 3,
        paymentMethod: 'cheque',
        sapeurName: 'Pierre Martin',
        teamName: 'Équipe Bravo',
        associationName: 'Test Association',
        associationAddress: '123 Test Street',
        legalText: 'Test legal text',
        enableTracking: false
      };

      const text = ReceiptTemplateService.generateReceiptText(testData);
      
      expect(text).toContain('Jean Dupont');
      expect(text).toContain('25€');
      expect(text).toContain('3 calendriers'); // Pluriel
      expect(text).toContain('Chèque');
      expect(text).toContain('Pierre Martin (Équipe Bravo)');
      expect(text).toContain('SP-20241201-123456');
      expect(text).toContain('Test Association');
    });
  });
});

describe('EmailLogService', () => {
  describe('createEmailLog', () => {
    it('should create log successfully', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      supabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'test-id-123' },
        error: null
      });

      const result = await EmailLogService.createEmailLog({
        transactionId: 'trans-123',
        emailTo: 'test@exemple.com',
        subject: 'Test Subject',
        status: 'sent',
        receiptNumber: 'SP-20241201-123456'
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('test-id-123');
    });

    it('should detect email provider correctly', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      supabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'test-id-123' },
        error: null
      });

      await EmailLogService.createEmailLog({
        transactionId: 'trans-123',
        emailTo: 'user@gmail.com',
        subject: 'Test Subject',
        status: 'sent'
      });

      // Vérifier que l'appel a été fait avec le bon provider
      const insertCall = supabase.from().insert.mock.calls[0][0];
      expect(insertCall.email_provider).toBe('Gmail');
    });
  });

  describe('updateEmailLog', () => {
    it('should update log status correctly', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      supabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const result = await EmailLogService.updateEmailLog('log-123', {
        status: 'opened',
        openedAt: '2024-12-01T10:30:00Z'
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('ReceiptStorageService', () => {
  describe('uploadReceiptHTML', () => {
    it('should upload HTML successfully', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      supabase.storage.from().upload.mockResolvedValue({
        data: { path: 'test/path' },
        error: null
      });
      supabase.storage.from().createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://signed-url.com' }
      });

      const result = await ReceiptStorageService.uploadReceiptHTML(
        '<html>Test</html>', 
        'SP-20241201-123456'
      );

      expect(result).toBe('https://signed-url.com');
    });
  });

  describe('deleteReceipt', () => {
    it('should delete receipt files successfully', async () => {
      const { supabase } = require('@/shared/lib/supabase');
      supabase.storage.from().remove.mockResolvedValue({
        error: null
      });

      const result = await ReceiptStorageService.deleteReceipt('SP-20241201-123456');

      expect(result.success).toBe(true);
    });
  });
});

// Tests d'intégration simulés
describe('Integration Tests', () => {
  it('should handle complete email flow with logging', async () => {
    const { supabase } = require('@/shared/lib/supabase');
    
    // Mock des réponses Supabase
    supabase.from().select().eq().single.mockResolvedValue({
      data: {
        smtp_from_name: 'Test Sapeurs',
        association_name: 'Test Association',
        enable_tracking: true
      },
      error: null
    });

    supabase.from().insert().select().single.mockResolvedValue({
      data: { id: 'log-123' },
      error: null
    });

    supabase.storage.from().upload.mockResolvedValue({
      data: { path: 'test/path' },
      error: null
    });

    // Test template generation avec settings DB
    const settings = await ReceiptTemplateService.getEmailSettings();
    expect(settings.association_name).toBe('Test Association');

    // Test log creation
    const logResult = await EmailLogService.createEmailLog({
      transactionId: 'trans-123',
      emailTo: 'test@gmail.com',
      subject: 'Test',
      status: 'pending'
    });

    expect(logResult.success).toBe(true);
    expect(logResult.id).toBe('log-123');
  });
});