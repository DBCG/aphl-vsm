import {
  constructVSPUrl,
  constructVSPId,
  parseIGCanonical,
  validateVSPVersion,
  generateVSPName,
  generateVSPTitle
} from './vspHelpers'
import { VSPMetadata } from '@/types/vspTypes'

describe('vspHelpers', () => {
  describe('constructVSPUrl', () => {
    const baseMetadata: VSPMetadata = {
      igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0',
      igUrl: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
      igVersion: '6.1.0',
      igPackageId: 'hl7.fhir.us.core',
      igName: 'USCore',
      igTitle: 'US Core',
      vspVersion: '2026-01',
      status: 'draft'
    }

    it('should build the correct URL for a standard IG', () => {
      const result = constructVSPUrl(baseMetadata)
      expect(result).toBe('http://hl7.org/fhir/us/core-vsp/6.1.0/Library/hl7.fhir.us.core-vsp-2026-01')
    })

    it('should strip /ImplementationGuide/... from the IG URL', () => {
      const result = constructVSPUrl(baseMetadata)
      expect(result).not.toContain('ImplementationGuide')
    })

    it('should handle different IG URLs', () => {
      const metadata: VSPMetadata = {
        ...baseMetadata,
        igUrl: 'http://hl7.org/fhir/us/ecr/ImplementationGuide/hl7.fhir.us.ecr',
        igVersion: '2.1.0',
        igPackageId: 'hl7.fhir.us.ecr',
        vspVersion: '2025-06'
      }
      const result = constructVSPUrl(metadata)
      expect(result).toBe('http://hl7.org/fhir/us/ecr-vsp/2.1.0/Library/hl7.fhir.us.ecr-vsp-2025-06')
    })

    it('should handle VSP version with different months', () => {
      const metadata: VSPMetadata = { ...baseMetadata, vspVersion: '2026-12' }
      const result = constructVSPUrl(metadata)
      expect(result).toContain('hl7.fhir.us.core-vsp-2026-12')
    })
  })

  describe('constructVSPId', () => {
    it('should build a correct VSP ID including the IG version', () => {
      expect(constructVSPId('hl7.fhir.us.core', '6.1.0', '2026-01')).toBe('hl7.fhir.us.core.6.1.0-2026-01')
    })

    it('should handle different package IDs and versions', () => {
      expect(constructVSPId('hl7.fhir.us.ecr', '2.1.0', '2025-06')).toBe('hl7.fhir.us.ecr.2.1.0-2025-06')
    })

    it('should include the full version string', () => {
      const id = constructVSPId('some.package', '1.0.0', '2030-12')
      expect(id).toBe('some.package.1.0.0-2030-12')
    })

    it('should produce distinct IDs for different IG versions with the same VSP version (issue #700)', () => {
      expect(constructVSPId('hl7.fhir.us.core', '6.1.0', '2026-06'))
        .not.toBe(constructVSPId('hl7.fhir.us.core', '6.2.0', '2026-06'))
    })
  })

  describe('parseIGCanonical', () => {
    it('should split canonical into URL and version', () => {
      const result = parseIGCanonical('http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0')
      expect(result.url).toBe('http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core')
      expect(result.version).toBe('6.1.0')
    })

    it('should handle canonical without version', () => {
      const result = parseIGCanonical('http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core')
      expect(result.url).toBe('http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core')
      expect(result.version).toBeUndefined()
    })

    it('should handle canonical with complex version', () => {
      const result = parseIGCanonical('http://example.org/ig|1.2.3-beta')
      expect(result.url).toBe('http://example.org/ig')
      expect(result.version).toBe('1.2.3-beta')
    })
  })

  describe('validateVSPVersion', () => {
    it('should accept valid YYYY-MM formats', () => {
      expect(validateVSPVersion('2026-01')).toBe(true)
      expect(validateVSPVersion('2026-06')).toBe(true)
      expect(validateVSPVersion('2026-12')).toBe(true)
      expect(validateVSPVersion('2000-01')).toBe(true)
      expect(validateVSPVersion('9999-09')).toBe(true)
    })

    it('should reject invalid month 00', () => {
      expect(validateVSPVersion('2026-00')).toBe(false)
    })

    it('should reject invalid month > 12', () => {
      expect(validateVSPVersion('2026-13')).toBe(false)
      expect(validateVSPVersion('2026-99')).toBe(false)
    })

    it('should reject short year', () => {
      expect(validateVSPVersion('26-01')).toBe(false)
      expect(validateVSPVersion('202-01')).toBe(false)
    })

    it('should reject month without leading zero', () => {
      expect(validateVSPVersion('2026-1')).toBe(false)
      expect(validateVSPVersion('2026-9')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(validateVSPVersion('')).toBe(false)
    })

    it('should reject non-date formats', () => {
      expect(validateVSPVersion('not-a-date')).toBe(false)
      expect(validateVSPVersion('2026/01')).toBe(false)
      expect(validateVSPVersion('2026.01')).toBe(false)
      expect(validateVSPVersion('20260-01')).toBe(false)
    })

    it('should reject formats with extra parts', () => {
      expect(validateVSPVersion('2026-01-01')).toBe(false)
      expect(validateVSPVersion('2026-01-')).toBe(false)
    })
  })

  describe('generateVSPName', () => {
    it('should create a clean identifier from IG name and version', () => {
      expect(generateVSPName('USCore', '6.1.0')).toBe('USCore610ValueSetPackageDefinition')
    })

    it('should strip spaces from IG name', () => {
      expect(generateVSPName('US Core', '6.1.0')).toBe('USCore610ValueSetPackageDefinition')
    })

    it('should strip dots and hyphens from IG name', () => {
      expect(generateVSPName('hl7.fhir.us-core', '6.1.0')).toBe('hl7fhiruscore610ValueSetPackageDefinition')
    })

    it('should strip non-numeric chars from version', () => {
      expect(generateVSPName('Test', '1.2.3-beta')).toBe('Test123ValueSetPackageDefinition')
    })

    it('should handle simple names and versions', () => {
      expect(generateVSPName('ECR', '2.0.0')).toBe('ECR200ValueSetPackageDefinition')
    })
  })

  describe('generateVSPTitle', () => {
    it('should create a human-readable title', () => {
      expect(generateVSPTitle('US Core', '6.1.0')).toBe('US Core 6.1.0 Value Set Package Definition')
    })

    it('should preserve spaces in the IG title', () => {
      expect(generateVSPTitle('Electronic Case Reporting', '2.1.0')).toBe('Electronic Case Reporting 2.1.0 Value Set Package Definition')
    })

    it('should handle single-word titles', () => {
      expect(generateVSPTitle('ECR', '1.0.0')).toBe('ECR 1.0.0 Value Set Package Definition')
    })
  })
})
