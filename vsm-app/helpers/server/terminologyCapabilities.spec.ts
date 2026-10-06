import Client from 'fhir-kit-client'
import { clearCatalogueCache, getCodeSystemCatalogue } from '@/helpers/server/terminologyCapabilities'

let nextBaseUrl = 0

// Each mock client gets its own base URL so the per-server cache doesn't leak
// between tests.
const mockClient = (responses: { terminologyCapabilities?: any; codeSystemNames?: any }) =>
  ({
    baseUrl: `https://terminology-${nextBaseUrl++}.example.com/fhir`,
    request: jest.fn((path: string) =>
      Promise.resolve(path.startsWith('metadata') ? responses.terminologyCapabilities : responses.codeSystemNames)
    )
  }) as unknown as Client

beforeEach(() => clearCatalogueCache())

describe('getCatalogue', () => {
  it('reads code systems and their full version history from ?mode=terminology', async () => {
    const client = mockClient({
      terminologyCapabilities: {
        resourceType: 'TerminologyCapabilities',
        codeSystem: [
          {
            uri: 'http://hl7.org/fhir/sid/cvx',
            version: [{ code: '2026-08-12', isDefault: true }, { code: '2026-04-09' }]
          }
        ]
      }
    })

    const catalogue = await getCodeSystemCatalogue(client)

    expect(catalogue.codeSystems).toEqual([
      { uri: 'http://hl7.org/fhir/sid/cvx', name: 'http://hl7.org/fhir/sid/cvx', latestVersion: '2026-08-12' }
    ])
    expect(catalogue.versionsByUri).toEqual({ 'http://hl7.org/fhir/sid/cvx': ['2026-08-12', '2026-04-09'] })
    expect(client.request).toHaveBeenCalledWith('metadata?mode=terminology')
  })

  it('resolves display names from the companion CodeSystem search', async () => {
    const client = mockClient({
      terminologyCapabilities: {
        codeSystem: [{ uri: 'http://loinc.org', version: [{ code: '2.83', isDefault: true }] }]
      },
      codeSystemNames: {
        resourceType: 'Bundle',
        entry: [{ resource: { resourceType: 'CodeSystem', url: 'http://loinc.org', name: 'LOINC' } }]
      }
    })

    expect((await getCodeSystemCatalogue(client)).codeSystems).toEqual([
      { uri: 'http://loinc.org', name: 'LOINC', latestVersion: '2.83' }
    ])
    expect(client.request).toHaveBeenCalledWith('CodeSystem?_count=200&_elements=url,name,title')
  })

  it('falls back to title, then to the uri, when a name is missing', async () => {
    const client = mockClient({
      terminologyCapabilities: {
        codeSystem: [{ uri: 'http://loinc.org' }, { uri: 'http://snomed.info/sct' }, { uri: 'http://example.com' }]
      },
      codeSystemNames: {
        entry: [
          { resource: { url: 'http://loinc.org', title: 'Logical Observation Identifiers' } },
          { resource: { url: 'http://snomed.info/sct', name: 'SNOMEDCT_US', title: 'SNOMED CT US Edition' } }
        ]
      }
    })

    expect((await getCodeSystemCatalogue(client)).codeSystems.map((c) => c.name)).toEqual([
      'Logical Observation Identifiers',
      'SNOMEDCT_US',
      'http://example.com'
    ])
  })

  it('keeps the catalogue when name resolution fails', async () => {
    const client = {
      baseUrl: 'https://names-down.example.com/fhir',
      request: jest.fn((path: string) =>
        path.startsWith('metadata')
          ? Promise.resolve({ codeSystem: [{ uri: 'http://loinc.org', version: [{ code: '2.83' }] }] })
          : Promise.reject(new Error('search unavailable'))
      )
    } as unknown as Client

    expect((await getCodeSystemCatalogue(client)).codeSystems).toEqual([
      { uri: 'http://loinc.org', name: 'http://loinc.org', latestVersion: '2.83' }
    ])
  })

  it('uses the first version when none is flagged isDefault', async () => {
    const client = mockClient({
      terminologyCapabilities: {
        codeSystem: [{ uri: 'http://example.com', version: [{ code: '2.0.0' }, { code: '1.0.0' }] }]
      }
    })

    expect((await getCodeSystemCatalogue(client)).codeSystems[0].latestVersion).toBe('2.0.0')
  })

  it('skips entries with no uri and versions with no code', async () => {
    const client = mockClient({
      terminologyCapabilities: {
        codeSystem: [
          { version: [{ code: '1.0.0' }] },
          { uri: 'http://loinc.org', version: [{ code: '2.83' }, {}] }
        ]
      }
    })

    const catalogue = await getCodeSystemCatalogue(client)
    expect(catalogue.codeSystems.map((c) => c.uri)).toEqual(['http://loinc.org'])
    expect(catalogue.versionsByUri['http://loinc.org']).toEqual(['2.83'])
  })

  it('returns an empty catalogue when the server lists nothing', async () => {
    const client = mockClient({ terminologyCapabilities: { resourceType: 'TerminologyCapabilities' } })

    expect(await getCodeSystemCatalogue(client)).toEqual({ codeSystems: [], versionsByUri: {} })
  })
})

describe('catalogue caching', () => {
  const responses = {
    terminologyCapabilities: {
      codeSystem: [{ uri: 'http://loinc.org', version: [{ code: '2.83', isDefault: true }] }]
    },
    codeSystemNames: { entry: [{ resource: { url: 'http://loinc.org', name: 'LOINC' } }] }
  }

  it('refetches once the cached catalogue is an hour old', async () => {
    jest.useFakeTimers()
    try {
      const client = mockClient(responses)

      const first = await getCodeSystemCatalogue(client)
      // two requests per catalogue build
      expect(client.request).toHaveBeenCalledTimes(2)

      jest.advanceTimersByTime(59 * 60 * 1000)
      const withinTtl = await getCodeSystemCatalogue(client)
      expect(client.request).toHaveBeenCalledTimes(2)
      expect(withinTtl).toBe(first)

      jest.advanceTimersByTime(2 * 60 * 1000)
      const afterTtl = await getCodeSystemCatalogue(client)
      expect(client.request).toHaveBeenCalledTimes(4)
      expect(afterTtl).not.toBe(first)
      // A refetch must still produce a usable catalogue, not just a cache miss.
      expect(afterTtl.codeSystems).toEqual([
        { uri: 'http://loinc.org', name: 'LOINC', latestVersion: '2.83' }
      ])
    } finally {
      jest.useRealTimers()
    }
  })

  it('builds once when three callers ask at the same time', async () => {
    const client = mockClient(responses)

    await Promise.all([getCodeSystemCatalogue(client), getCodeSystemCatalogue(client), getCodeSystemCatalogue(client)])

    // Three callers, one build: the two requests below rather than six.
    expect((client.request as jest.Mock).mock.calls.map(([path]) => path)).toEqual([
      'metadata?mode=terminology',
      'CodeSystem?_count=200&_elements=url,name,title'
    ])
  })

  it('does not cache a failed catalogue read', async () => {
    const client = {
      baseUrl: 'https://flaky.example.com/fhir',
      request: jest
        .fn()
        .mockRejectedValueOnce(new Error('server unavailable'))
        .mockResolvedValue({ codeSystem: [{ uri: 'http://loinc.org', version: [{ code: '2.83' }] }] })
    } as unknown as Client

    await expect(getCodeSystemCatalogue(client)).rejects.toThrow('server unavailable')
    expect((await getCodeSystemCatalogue(client)).codeSystems).toEqual([
      { uri: 'http://loinc.org', name: 'http://loinc.org', latestVersion: '2.83' }
    ])
  })

  it('keeps separate catalogues for separate servers', async () => {
    const vsac = mockClient(responses)
    const other = mockClient({
      terminologyCapabilities: { codeSystem: [{ uri: 'http://example.com', version: [{ code: '1.0.0' }] }] }
    })

    expect((await getCodeSystemCatalogue(vsac)).codeSystems[0].uri).toBe('http://loinc.org')
    expect((await getCodeSystemCatalogue(other)).codeSystems[0].uri).toBe('http://example.com')
  })
})
