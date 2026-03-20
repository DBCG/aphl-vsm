/**
 * @jest-environment node
 */

import { Readable } from 'stream'
import zlib from 'zlib'

// ---------------------------------------------------------------------------
// Helpers – build a real gzipped tarball containing an IG JSON resource
// ---------------------------------------------------------------------------
function createIGTarball(ig: Record<string, unknown>): Promise<Buffer> {
  const tar = require('tar-stream')
  return new Promise((resolve, reject) => {
    const pack = tar.pack()
    pack.entry({ name: 'package/ImplementationGuide-test.json' }, JSON.stringify(ig))
    pack.finalize()

    const chunks: Buffer[] = []
    const gzip = zlib.createGzip()
    pack.pipe(gzip)
    gzip.on('data', (chunk: Buffer) => chunks.push(chunk))
    gzip.on('end', () => resolve(Buffer.concat(chunks)))
    gzip.on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// Mocks – must be set up before the module under test is imported
// ---------------------------------------------------------------------------

// Bull: capture the processor callback registered by DependencyQueue.process()
let capturedProcessor: (job: any, done: jest.Mock) => Promise<any>
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn((fn: any) => {
      capturedProcessor = fn
    }),
    add: jest.fn()
  }))
})

// FhirClient
const mockRead = jest.fn()
const mockUpdate = jest.fn()
jest.mock('../../backend/clients/FhirCdrClient', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      read: mockRead,
      update: mockUpdate,
      baseUrl: 'http://fhir-server',
      customHeaders: {}
    }))
  }
}))

// Undici – used by callDataRequirements and callInferManifestParameters
const mockUndiciFetch = jest.fn()
jest.mock('undici', () => ({
  fetch: mockUndiciFetch,
  Agent: jest.fn().mockImplementation(() => ({}))
}))

// Cache
const mockHset = jest.fn()
jest.mock('../../cache', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockResolvedValue({
      hset: mockHset,
      sadd: jest.fn(),
      expire: jest.fn()
    })
  }
}))

// Logger – silence all output
jest.mock('../../helpers/server/logger', () => ({
  __esModule: true,
  default: {
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }))
  }
}))

// Config
jest.mock('../../config', () => ({
  QUEUE_REDIS_URL: 'redis://localhost:6379',
  DEFAULT_JOB_CONFIG: {},
  JOB_EXPIRATION: 3600
}))

// Constants
jest.mock('../../constants', () => ({
  JOB_STATUS: { IN_PROGRESS: 'in_progress', COMPLETED: 'completed', FAILED: 'failed' },
  JOB_TYPE: { FETCH_DEPENDENCIES: 'fetch_dependencies' }
}))

// Import the module – triggers DependencyQueue.process() which sets capturedProcessor
require('../../worker/DependencyQueue')

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const SAMPLE_IG: fhir4.ImplementationGuide = {
  resourceType: 'ImplementationGuide',
  id: 'hl7.fhir.us.core-6.1.0',
  url: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
  version: '6.1.0',
  name: 'USCore',
  title: 'US Core',
  status: 'active',
  packageId: 'hl7.fhir.us.core',
  fhirVersion: ['4.0.1']
}

const SAMPLE_MODULE_DEFINITION: fhir4.Library = {
  resourceType: 'Library',
  id: 'module-def-1',
  status: 'active',
  type: { coding: [{ code: 'module-definition' }] }
}

const SAMPLE_MANIFEST_LIBRARY: fhir4.Library = {
  resourceType: 'Library',
  id: 'manifest-1',
  status: 'active',
  type: { coding: [{ code: 'manifest' }] },
  contained: [
    {
      resourceType: 'Parameters',
      id: 'expansion-parameters',
      parameter: [
        { name: 'system-version', valueString: 'http://snomed.info/sct|http://snomed.info/sct/731000124108/version/20230901' },
        { name: 'canonicalVersion', valueString: 'http://hl7.org/fhir/us/core/ValueSet/birthsex|6.1.0' }
      ]
    } as fhir4.Parameters
  ],
  relatedArtifact: [
    { type: 'depends-on', resource: 'http://hl7.org/fhir/us/core/ValueSet/birthsex|6.1.0' }
  ]
}

function createMockJob(overrides: Partial<{ igCanonical: string; igPackageId: string; userId: string }> = {}) {
  return {
    id: 'job-123',
    data: {
      igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0',
      igPackageId: 'hl7.fhir.us.core',
      userId: 'user-1',
      ...overrides
    },
    progress: jest.fn()
  }
}

function makeFhir404() {
  const err: any = new Error('Not Found')
  err.response = { status: 404 }
  return err
}

// Helper to mock undici responses for $data-requirements (GET) and $infer-manifest-parameters (POST)
function mockUndiciFetchForSuccess() {
  mockUndiciFetch.mockImplementation(async (url: string) => {
    if (url.includes('$data-requirements')) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => SAMPLE_MODULE_DEFINITION
      }
    }
    if (url.includes('$infer-manifest-parameters')) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => SAMPLE_MANIFEST_LIBRARY
      }
    }
    throw new Error(`Unexpected undici fetch URL: ${url}`)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks()
})

describe('DependencyQueue processor', () => {
  // -----------------------------------------------------------------------
  // ensureIGOnFhirServer
  // -----------------------------------------------------------------------
  describe('Step 1: ensureIGOnFhirServer', () => {
    test('cache hit – uses IG already on FHIR server, skips Simplifier download', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetchForSuccess()

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      // FhirClient.read was called with the right resourceType + id
      expect(mockRead).toHaveBeenCalledWith({
        resourceType: 'ImplementationGuide',
        id: 'hl7.fhir.us.core-6.1.0'
      })

      // No PUT since the IG was already cached
      expect(mockUpdate).not.toHaveBeenCalled()

      // Job completed (done called with result containing igName)
      expect(done).toHaveBeenCalledTimes(1)
      const result = done.mock.calls[0][1]
      expect(result.igName).toBe('USCore')
      expect(result.igTitle).toBe('US Core')
    })

    test('cache miss – downloads from Simplifier, PUTs to FHIR server', async () => {
      // First call to read → 404
      mockRead.mockRejectedValue(makeFhir404())
      mockUpdate.mockResolvedValue({ ...SAMPLE_IG })
      mockUndiciFetchForSuccess()

      // Build a real tarball containing the IG
      const igForTarball = { ...SAMPLE_IG, id: 'original-id' }
      const tarball = await createIGTarball(igForTarball)
      ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => tarball.buffer.slice(tarball.byteOffset, tarball.byteOffset + tarball.byteLength)
      })

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      // Simplifier download was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://packages.simplifier.net/hl7.fhir.us.core/6.1.0'
      )

      // PUT was called with the computed resource ID
      expect(mockUpdate).toHaveBeenCalledWith({
        resourceType: 'ImplementationGuide',
        id: 'hl7.fhir.us.core-6.1.0',
        body: expect.objectContaining({
          resourceType: 'ImplementationGuide',
          id: 'hl7.fhir.us.core-6.1.0'
        })
      })

      // Job completed successfully
      expect(done).toHaveBeenCalledTimes(1)
      const result = done.mock.calls[0][1]
      expect(result.source).toBe('fhir-operations')
    })

    test('Simplifier download failure – returns graceful fallback', async () => {
      mockRead.mockRejectedValue(makeFhir404())
      ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      })

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      // No PUT attempted
      expect(mockUpdate).not.toHaveBeenCalled()

      // Job returns fallback result
      const result = done.mock.calls[0][1]
      expect(result.source).toBe('none')
      expect(result.warnings[0]).toContain('Could not download')
    })

    test('PUT failure – returns graceful fallback', async () => {
      mockRead.mockRejectedValue(makeFhir404())
      mockUpdate.mockRejectedValue(new Error('Server error'))

      const igForTarball = { ...SAMPLE_IG }
      const tarball = await createIGTarball(igForTarball)
      ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => tarball.buffer.slice(tarball.byteOffset, tarball.byteOffset + tarball.byteLength)
      })

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const result = done.mock.calls[0][1]
      expect(result.source).toBe('none')
      expect(result.warnings[0]).toContain('Could not download')
    })
  })

  // -----------------------------------------------------------------------
  // callDataRequirements
  // -----------------------------------------------------------------------
  describe('Step 2: callDataRequirements', () => {
    test('uses GET method, not POST', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetchForSuccess()

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      // Find the $data-requirements call
      const drCall = mockUndiciFetch.mock.calls.find(
        ([url]: [string]) => url.includes('$data-requirements')
      )
      expect(drCall).toBeDefined()
      expect(drCall[1].method).toBe('GET')
    })

    test('calls instance-level URL with igResourceId', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetchForSuccess()

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const drCall = mockUndiciFetch.mock.calls.find(
        ([url]: [string]) => url.includes('$data-requirements')
      )
      expect(drCall[0]).toBe(
        'http://fhir-server/ImplementationGuide/hl7.fhir.us.core-6.1.0/$data-requirements'
      )
    })

    test('does not send a body or Content-Type header', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetchForSuccess()

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const drCall = mockUndiciFetch.mock.calls.find(
        ([url]: [string]) => url.includes('$data-requirements')
      )
      expect(drCall[1].body).toBeUndefined()
      expect(drCall[1].headers['Content-Type']).toBeUndefined()
    })

    test('failure returns fallback result with igName/igTitle preserved', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetch.mockImplementation(async (url: string) => {
        if (url.includes('$data-requirements')) {
          return { ok: false, status: 500, statusText: 'Error', text: async () => 'Server error' }
        }
        throw new Error(`Unexpected URL: ${url}`)
      })

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const result = done.mock.calls[0][1]
      expect(result.source).toBe('none')
      expect(result.igName).toBe('USCore')
      expect(result.igTitle).toBe('US Core')
      expect(result.warnings[0]).toContain('$data-requirements operation failed')
    })
  })

  // -----------------------------------------------------------------------
  // Full success flow
  // -----------------------------------------------------------------------
  describe('full success flow', () => {
    test('returns manifest data with codeSystems, valueSets, and relatedArtifact', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetchForSuccess()

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const result = done.mock.calls[0][1]
      expect(result.source).toBe('fhir-operations')
      expect(result.igName).toBe('USCore')
      expect(result.igTitle).toBe('US Core')

      // codeSystems from system-version parameter
      expect(result.manifestData.codeSystems['http://snomed.info/sct']).toBeDefined()

      // valueSets from canonicalVersion parameter
      expect(result.manifestData.valueSets['http://hl7.org/fhir/us/core/ValueSet/birthsex']).toBeDefined()

      // relatedArtifact passed through
      expect(result.manifestData.relatedArtifact).toHaveLength(1)
    })

    test('reports progress for all three steps', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetchForSuccess()

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      // 3 progress steps + 1 final
      expect(job.progress).toHaveBeenCalledTimes(4)
      expect(job.progress).toHaveBeenCalledWith(expect.objectContaining({ current: 1, total: 3 }))
      expect(job.progress).toHaveBeenCalledWith(expect.objectContaining({ current: 2, total: 3 }))
      expect(job.progress).toHaveBeenCalledWith(expect.objectContaining({ current: 3, total: 3 }))
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    test('missing version in canonical returns error', async () => {
      const job = createMockJob({ igCanonical: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core' })
      const done = jest.fn()
      await capturedProcessor(job, done)

      const result = done.mock.calls[0][1]
      expect(result.error).toContain('version')
    })

    test('parses canonicalVersion from valueCanonical (spec-correct)', async () => {
      const manifestWithValueCanonical = {
        ...SAMPLE_MANIFEST_LIBRARY,
        contained: [
          {
            resourceType: 'Parameters',
            id: 'expansion-parameters',
            parameter: [
              { name: 'system-version', valueString: 'http://snomed.info/sct|20230901' },
              { name: 'canonicalVersion', valueCanonical: 'http://example.org/ValueSet/test-vs|1.0.0' }
            ]
          }
        ]
      }

      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetch.mockImplementation(async (url: string) => {
        if (url.includes('$data-requirements')) {
          return { ok: true, status: 200, statusText: 'OK', json: async () => SAMPLE_MODULE_DEFINITION }
        }
        if (url.includes('$infer-manifest-parameters')) {
          return { ok: true, status: 200, statusText: 'OK', json: async () => manifestWithValueCanonical }
        }
        throw new Error(`Unexpected URL: ${url}`)
      })

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const result = done.mock.calls[0][1]
      expect(result.manifestData.valueSets['http://example.org/ValueSet/test-vs']).toEqual(['1.0.0'])
    })

    test('$infer-manifest-parameters failure returns fallback', async () => {
      mockRead.mockResolvedValue(SAMPLE_IG)
      mockUndiciFetch.mockImplementation(async (url: string) => {
        if (url.includes('$data-requirements')) {
          return { ok: true, status: 200, statusText: 'OK', json: async () => SAMPLE_MODULE_DEFINITION }
        }
        if (url.includes('$infer-manifest-parameters')) {
          return { ok: false, status: 500, statusText: 'Error', text: async () => 'Server error' }
        }
        throw new Error(`Unexpected URL: ${url}`)
      })

      const job = createMockJob()
      const done = jest.fn()
      await capturedProcessor(job, done)

      const result = done.mock.calls[0][1]
      expect(result.source).toBe('none')
      expect(result.warnings[0]).toContain('$infer-manifest-parameters operation failed')
    })
  })
})
