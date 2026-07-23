import FhirClient from '@/backend/clients/FhirCdrClient'
import { fetchLeafValueSets, ValueSetWithPin } from './serverValueSetHelper'

jest.mock('fhir-kit-client')

describe('serverValueSetHelper', () => {
  describe('fetchLeafValueSets', () => {
    it('tags a resolved ValueSet with the canonical (bare or pinned) used to look it up', async () => {
      FhirClient.getInstance().batch = jest.fn().mockResolvedValueOnce({
        entry: [
          {
            resource: {
              entry: [
                { resource: { resourceType: 'ValueSet', id: 'foo-latest', url: 'http://example.com/ValueSet/foo', version: '2.0' } }
              ]
            }
          }
        ]
      })

      const result = await fetchLeafValueSets({ leafValueSetCanonicals: ['http://example.com/ValueSet/foo'] })

      expect(result?.[0]?.pinnedCanonical).toBe('http://example.com/ValueSet/foo')
    })

    it('keeps the pinned and unpinned canonical correctly paired to their own resolved ValueSet, not swapped', async () => {
      // one batch entry per requested canonical, in request order - simulates the FHIR
      // server resolving a pinned request and an unpinned request for the same bare url
      // to two different underlying resources
      FhirClient.getInstance().batch = jest.fn().mockResolvedValueOnce({
        entry: [
          {
            resource: {
              entry: [
                { resource: { resourceType: 'ValueSet', id: 'foo-1.0', url: 'http://example.com/ValueSet/foo', version: '1.0' } }
              ]
            }
          },
          {
            resource: {
              entry: [
                { resource: { resourceType: 'ValueSet', id: 'foo-latest', url: 'http://example.com/ValueSet/foo', version: '2.0' } }
              ]
            }
          }
        ]
      })

      const result = await fetchLeafValueSets({
        leafValueSetCanonicals: ['http://example.com/ValueSet/foo|1.0', 'http://example.com/ValueSet/foo']
      })

      const pinnedRow = result?.find((vs: ValueSetWithPin) => vs.id === 'foo-1.0')
      const unpinnedRow = result?.find((vs: ValueSetWithPin) => vs.id === 'foo-latest')

      expect(pinnedRow?.pinnedCanonical).toBe('http://example.com/ValueSet/foo|1.0')
      expect(unpinnedRow?.pinnedCanonical).toBe('http://example.com/ValueSet/foo')
    })

    it('tags the chosen "latest" resource when a single query resolves to more than one match', async () => {
      FhirClient.getInstance().batch = jest.fn().mockResolvedValueOnce({
        entry: [
          {
            resource: {
              entry: [
                { resource: { resourceType: 'ValueSet', id: 'foo-old', url: 'http://example.com/ValueSet/foo', version: '2020-01-01' } },
                { resource: { resourceType: 'ValueSet', id: 'foo-new', url: 'http://example.com/ValueSet/foo', version: '2024-01-01' } }
              ]
            }
          }
        ]
      })

      const result = await fetchLeafValueSets({ leafValueSetCanonicals: ['http://example.com/ValueSet/foo'] })

      expect(result).toHaveLength(1)
      expect(result?.[0]?.id).toBe('foo-new')
      expect(result?.[0]?.pinnedCanonical).toBe('http://example.com/ValueSet/foo')
    })
  })
})
