import { isVSACEndpoint, findVSACEndpoint } from './endpointHelpers'

describe('endpointHelpers', () => {
  describe('isVSACEndpoint', () => {
    it('should return true for VSAC http URL', () => {
      const endpoint = { address: 'http://cts.nlm.nih.gov/fhir' } as fhir4.Endpoint
      expect(isVSACEndpoint(endpoint)).toBe(true)
    })

    it('should return true for VSAC https URL', () => {
      const endpoint = { address: 'https://cts.nlm.nih.gov/fhir' } as fhir4.Endpoint
      expect(isVSACEndpoint(endpoint)).toBe(true)
    })

    it('should return true for VSAC URL with trailing slash', () => {
      const endpoint = { address: 'https://cts.nlm.nih.gov/fhir/' } as fhir4.Endpoint
      expect(isVSACEndpoint(endpoint)).toBe(true)
    })

    it('should be case-insensitive', () => {
      const endpoint = { address: 'HTTPS://CTS.NLM.NIH.GOV/FHIR' } as fhir4.Endpoint
      expect(isVSACEndpoint(endpoint)).toBe(true)
    })

    it('should return false for non-VSAC endpoints', () => {
      const endpoint = { address: 'https://example.com/fhir' } as fhir4.Endpoint
      expect(isVSACEndpoint(endpoint)).toBe(false)
    })

    it('should return false for undefined endpoint', () => {
      expect(isVSACEndpoint(undefined)).toBe(false)
    })

    it('should return false for null endpoint', () => {
      expect(isVSACEndpoint(null)).toBe(false)
    })

    it('should return false for endpoint without address', () => {
      const endpoint = {} as fhir4.Endpoint
      expect(isVSACEndpoint(endpoint)).toBe(false)
    })
  })

  describe('findVSACEndpoint', () => {
    it('should find the VSAC endpoint from an array', () => {
      const endpoints = [
        { address: 'https://example.com/fhir' } as fhir4.Endpoint,
        { address: 'https://cts.nlm.nih.gov/fhir' } as fhir4.Endpoint,
        { address: 'https://other.com/fhir' } as fhir4.Endpoint
      ]
      const result = findVSACEndpoint(endpoints)
      expect(result?.address).toBe('https://cts.nlm.nih.gov/fhir')
    })

    it('should return undefined when no VSAC endpoint exists', () => {
      const endpoints = [
        { address: 'https://example.com/fhir' } as fhir4.Endpoint,
        { address: 'https://other.com/fhir' } as fhir4.Endpoint
      ]
      expect(findVSACEndpoint(endpoints)).toBeUndefined()
    })

    it('should return undefined for empty array', () => {
      expect(findVSACEndpoint([])).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      expect(findVSACEndpoint(undefined)).toBeUndefined()
    })
  })
})
