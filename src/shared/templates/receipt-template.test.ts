import { describe, it, expect, vi } from 'vitest'

// Mock the supabase client import used in the template service
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              smtp_from_name: null,
              smtp_from_email: null,
              association_name: null,
              association_address: null,
              association_siren: null,
              association_rna: null,
              legal_text: null,
              enable_tracking: null,
              template_version: null
            },
            error: null
          })
        })
      })
    })
  }
}))

import { ReceiptTemplateService } from './receipt-template'

describe('ReceiptTemplateService.getEmailSettings', () => {
  it('normalizes nullable DB fields to safe defaults', async () => {
    const settings = await ReceiptTemplateService.getEmailSettings()

    expect(settings.smtp_from_name).toBeTruthy()
    expect(settings.smtp_from_email).toContain('@')
    expect(settings.association_name).toBe('Amicale des Sapeurs-Pompiers')
    expect(settings.association_address).toBeTruthy()
    expect(typeof settings.enable_tracking).toBe('boolean')
    expect(settings.template_version).toBe('v1')
  })
})
