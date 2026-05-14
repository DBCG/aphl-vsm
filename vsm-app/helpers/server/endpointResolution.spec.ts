import { pickEndpointForCanonical } from './endpointResolution'
import { ARTIFACT_ROUTE_URL } from '@/constants'

const makeEndpoint = (id: string, address: string, artifactRoute?: string): fhir4.Endpoint => ({
  resourceType: 'Endpoint',
  id,
  status: 'active',
  connectionType: {
    system: 'http://terminology.hl7.org/CodeSystem/endpoint-connection-type',
    code: 'hl7-fhir-rest'
  },
  payloadType: [{ coding: [{ code: 'none' }] }],
  address,
  ...(artifactRoute !== undefined && {
    extension: [{ url: ARTIFACT_ROUTE_URL, valueUri: artifactRoute }]
  })
})

describe('pickEndpointForCanonical', () => {
  it('returns undefined when canonical is empty', () => {
    expect(pickEndpointForCanonical('', [makeEndpoint('a', 'https://a')])).toBeUndefined()
  })

  it('returns undefined when endpoints list is empty', () => {
    expect(pickEndpointForCanonical('http://loinc.org', [])).toBeUndefined()
  })

  it('matches an endpoint whose artifactRoute is a prefix of the canonical', () => {
    const ep = makeEndpoint('vsac', 'https://cts.nlm.nih.gov/fhir', 'http://cts.nlm.nih.gov/fhir')
    const result = pickEndpointForCanonical('http://cts.nlm.nih.gov/fhir/ValueSet/123', [ep])
    expect(result?.id).toBe('vsac')
  })

  it('does not match when the canonical does not start with the route', () => {
    const ep = makeEndpoint('vsac', 'https://cts.nlm.nih.gov/fhir', 'http://cts.nlm.nih.gov/fhir')
    const result = pickEndpointForCanonical('http://loinc.org', [ep])
    expect(result).toBeUndefined()
  })

  it('falls back to the no-artifactRoute endpoint when no route matches', () => {
    const fallback = makeEndpoint('default', 'https://tx.fhir.org/r4')
    const vsac = makeEndpoint('vsac', 'https://cts.nlm.nih.gov/fhir', 'http://cts.nlm.nih.gov/fhir')
    const result = pickEndpointForCanonical('http://loinc.org', [vsac, fallback])
    expect(result?.id).toBe('default')
  })

  it('prefers a matched route over the fallback', () => {
    const fallback = makeEndpoint('default', 'https://tx.fhir.org/r4')
    const vsac = makeEndpoint('vsac', 'https://cts.nlm.nih.gov/fhir', 'http://cts.nlm.nih.gov/fhir')
    const result = pickEndpointForCanonical('http://cts.nlm.nih.gov/fhir/CodeSystem/foo', [vsac, fallback])
    expect(result?.id).toBe('vsac')
  })

  it('picks the longest-prefix match when multiple routes match', () => {
    const broad = makeEndpoint('broad', 'https://broad', 'http://hl7.org/fhir')
    const narrow = makeEndpoint('narrow', 'https://narrow', 'http://hl7.org/fhir/us/core')
    const result = pickEndpointForCanonical('http://hl7.org/fhir/us/core/CodeSystem/x', [broad, narrow])
    expect(result?.id).toBe('narrow')
  })

  it('picks the longest-prefix match regardless of declaration order', () => {
    const narrow = makeEndpoint('narrow', 'https://narrow', 'http://hl7.org/fhir/us/core')
    const broad = makeEndpoint('broad', 'https://broad', 'http://hl7.org/fhir')
    const result = pickEndpointForCanonical('http://hl7.org/fhir/us/core/CodeSystem/x', [narrow, broad])
    expect(result?.id).toBe('narrow')
  })

  it('treats an artifactRoute extension with an empty valueUri as no-route (fallback candidate)', () => {
    const ep = makeEndpoint('partial', 'https://partial', '')
    const result = pickEndpointForCanonical('http://loinc.org', [ep])
    expect(result?.id).toBe('partial')
  })

  it('is case-sensitive when matching the prefix', () => {
    const ep = makeEndpoint('vsac', 'https://cts.nlm.nih.gov/fhir', 'http://Cts.Nlm.Nih.Gov/fhir')
    const result = pickEndpointForCanonical('http://cts.nlm.nih.gov/fhir/CodeSystem/x', [ep])
    expect(result).toBeUndefined()
  })

  it('returns undefined when there is no match and no fallback', () => {
    const vsac = makeEndpoint('vsac', 'https://cts.nlm.nih.gov/fhir', 'http://cts.nlm.nih.gov/fhir')
    const result = pickEndpointForCanonical('http://loinc.org', [vsac])
    expect(result).toBeUndefined()
  })
})
