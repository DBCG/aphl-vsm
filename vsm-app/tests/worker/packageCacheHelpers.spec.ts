jest.mock('fhir-kit-client')

import { hashPackageParams, stripCacheMetadata } from '@/worker/packageCacheHelpers'

describe('hashPackageParams', () => {
  it('returns a 12-character hex string', () => {
    const hash = hashPackageParams('http://route', 'http://artifact', 'http://terminology')
    expect(hash).toMatch(/^[0-9a-f]{12}$/)
  })

  it('returns the same hash for the same inputs', () => {
    const hash1 = hashPackageParams('http://a', 'http://b', 'http://c')
    const hash2 = hashPackageParams('http://a', 'http://b', 'http://c')
    expect(hash1).toBe(hash2)
  })

  it('returns a different hash when artifactRoute changes', () => {
    const hash1 = hashPackageParams('http://route-a', 'http://endpoint', 'http://terminology')
    const hash2 = hashPackageParams('http://route-b', 'http://endpoint', 'http://terminology')
    expect(hash1).not.toBe(hash2)
  })

  it('returns a different hash when artifactEndpointAddress changes', () => {
    const hash1 = hashPackageParams('http://route', 'http://endpoint-a', 'http://terminology')
    const hash2 = hashPackageParams('http://route', 'http://endpoint-b', 'http://terminology')
    expect(hash1).not.toBe(hash2)
  })

  it('returns a different hash when terminologyEndpointAddress changes', () => {
    const hash1 = hashPackageParams('http://route', 'http://endpoint', 'http://terminology-a')
    const hash2 = hashPackageParams('http://route', 'http://endpoint', 'http://terminology-b')
    expect(hash1).not.toBe(hash2)
  })
})

describe('stripCacheMetadata', () => {
  describe('JSON', () => {
    it('removes id, identifier, and meta from a cached Bundle and restores transaction type', () => {
      const cached = JSON.stringify({
        resourceType: 'Bundle',
        id: 'server-assigned-id',
        identifier: {
          system: 'http://aphl.org/fhir/vsm/cache/package',
          value: 'vsp-123|1.0.0'
        },
        meta: {
          tag: [{ system: 'http://aphl.org/fhir/vsm/cache', code: 'package-cache' }]
        },
        type: 'collection',
        entry: [
          { resource: { resourceType: 'ValueSet', id: 'vs-1' } }
        ]
      })

      const result = JSON.parse(stripCacheMetadata(cached, true))

      expect(result).not.toHaveProperty('id')
      expect(result).not.toHaveProperty('identifier')
      expect(result).not.toHaveProperty('meta')
      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('transaction')
      expect(result.entry).toHaveLength(1)
      expect(result.entry[0].resource.id).toBe('vs-1')
    })

    it('preserves all other Bundle properties', () => {
      const cached = JSON.stringify({
        resourceType: 'Bundle',
        id: 'abc-123',
        identifier: { system: 'http://aphl.org/fhir/vsm/cache/package', value: 'vsp-1|2.0' },
        meta: { tag: [] },
        type: 'collection',
        timestamp: '2026-01-15T00:00:00Z',
        total: 42,
        entry: [
          { resource: { resourceType: 'Library', id: 'lib-1', name: 'My VSP' } },
          { resource: { resourceType: 'ValueSet', id: 'vs-2', title: 'Test VS' } }
        ]
      })

      const result = JSON.parse(stripCacheMetadata(cached, true))

      expect(result.type).toBe('transaction')
      expect(result.timestamp).toBe('2026-01-15T00:00:00Z')
      expect(result.total).toBe(42)
      expect(result.entry).toHaveLength(2)
      expect(result.entry[0].resource.name).toBe('My VSP')
      expect(result.entry[1].resource.title).toBe('Test VS')
    })

    it('handles Bundle with no meta or identifier gracefully', () => {
      const cached = JSON.stringify({
        resourceType: 'Bundle',
        id: 'abc',
        type: 'collection',
        entry: []
      })

      const result = JSON.parse(stripCacheMetadata(cached, true))

      expect(result).not.toHaveProperty('id')
      expect(result).not.toHaveProperty('identifier')
      expect(result).not.toHaveProperty('meta')
      expect(result.resourceType).toBe('Bundle')
      expect(result.entry).toEqual([])
    })

    it('produces output matching original $package structure', () => {
      const original = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          { resource: { resourceType: 'ValueSet', id: 'vs-1', url: 'http://example.com/vs-1' } }
        ]
      }

      // Simulate what storeCachedPackage adds — type swapped to collection for storage
      const stored = {
        ...original,
        type: 'collection',
        id: 'server-id',
        identifier: { system: 'http://aphl.org/fhir/vsm/cache/package', value: 'vsp-1|1.0' },
        meta: { tag: [{ system: 'http://aphl.org/fhir/vsm/cache', code: 'package-cache' }] }
      }

      const result = JSON.parse(stripCacheMetadata(JSON.stringify(stored), true))

      expect(result).toEqual(original)
    })
  })

  describe('XML', () => {
    it('removes id, identifier, and meta elements and restores transaction type', () => {
      const cached = [
        '<Bundle xmlns="http://hl7.org/fhir">',
        '<id value="server-assigned-id"/>',
        '<identifier><system value="http://aphl.org/fhir/vsm/cache/package"/><value value="vsp-123|1.0.0"/></identifier>',
        '<meta><tag><system value="http://aphl.org/fhir/vsm/cache"/><code value="package-cache"/></tag></meta>',
        '<type value="collection"/>',
        '<entry><resource><ValueSet><id value="vs-1"/></ValueSet></resource></entry>',
        '</Bundle>'
      ].join('\n')

      const result = stripCacheMetadata(cached, false)

      expect(result).not.toContain('<id value="server-assigned-id"/>')
      expect(result).not.toContain('<identifier>')
      expect(result).not.toContain('package-cache')
      expect(result).not.toContain('<meta>')
      expect(result).toContain('<type value="transaction"/>')
      expect(result).toContain('<entry>')
      expect(result).toContain('<ValueSet>')
    })

    it('preserves entry content and structure', () => {
      const cached = [
        '<Bundle xmlns="http://hl7.org/fhir">',
        '<id value="abc-123"/>',
        '<identifier><system value="http://aphl.org/fhir/vsm/cache/package"/><value value="vsp-1|2.0"/></identifier>',
        '<meta><tag><system value="http://aphl.org/fhir/vsm/cache"/><code value="package-cache"/></tag></meta>',
        '<type value="collection"/>',
        '<entry>',
        '  <resource>',
        '    <Library>',
        '      <id value="lib-1"/>',
        '      <meta><profile value="http://example.com/profile"/></meta>',
        '      <name value="My VSP"/>',
        '    </Library>',
        '  </resource>',
        '</entry>',
        '<entry>',
        '  <resource>',
        '    <ValueSet>',
        '      <id value="vs-2"/>',
        '      <title value="Test VS"/>',
        '    </ValueSet>',
        '  </resource>',
        '</entry>',
        '</Bundle>'
      ].join('\n')

      const result = stripCacheMetadata(cached, false)

      expect(result).toContain('<name value="My VSP"/>')
      expect(result).toContain('<title value="Test VS"/>')
      expect(result).toContain('<Library>')
      expect(result).toContain('<ValueSet>')
    })

    it('only removes top-level meta, not nested resource meta', () => {
      const cached = [
        '<Bundle xmlns="http://hl7.org/fhir">',
        '<id value="abc"/>',
        '<meta><tag><system value="http://aphl.org/fhir/vsm/cache"/><code value="package-cache"/></tag></meta>',
        '<entry>',
        '  <resource>',
        '    <ValueSet>',
        '      <id value="vs-1"/>',
        '      <meta><profile value="http://hl7.org/fhir/StructureDefinition/ValueSet"/></meta>',
        '    </ValueSet>',
        '  </resource>',
        '</entry>',
        '</Bundle>'
      ].join('\n')

      const result = stripCacheMetadata(cached, false)

      // Top-level meta should be removed
      expect(result).not.toContain('package-cache')
      // Nested resource meta should be preserved
      expect(result).toContain('<meta><profile value="http://hl7.org/fhir/StructureDefinition/ValueSet"/></meta>')
    })

    it('produces output matching original $package structure', () => {
      const original = [
        '<Bundle xmlns="http://hl7.org/fhir">',
        '<type value="transaction"/>',
        '<entry><resource><ValueSet><id value="vs-1"/></ValueSet></resource></entry>',
        '</Bundle>'
      ].join('\n')

      // Simulate what storeCachedPackage injects (after <Bundle ...>) — type swapped to collection for storage
      const stored = [
        '<Bundle xmlns="http://hl7.org/fhir">',
        '<id value="server-id"/>',
        '<identifier><system value="http://aphl.org/fhir/vsm/cache/package"/><value value="vsp-1|1.0"/></identifier>',
        '<meta><tag><system value="http://aphl.org/fhir/vsm/cache"/><code value="package-cache"/></tag></meta>',
        '<type value="collection"/>',
        '<entry><resource><ValueSet><id value="vs-1"/></ValueSet></resource></entry>',
        '</Bundle>'
      ].join('\n')

      const result = stripCacheMetadata(stored, false)

      expect(result).toBe(original)
    })
  })
})
