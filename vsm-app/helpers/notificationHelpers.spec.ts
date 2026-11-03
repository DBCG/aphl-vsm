import { compareJobsByCreation, getReleaseRoute } from '@/helpers/notificationHelpers'
import { JobData } from '@/types/jobTypes'

const job = (overrides: Partial<JobData> = {}): JobData => ({
  jobId: 'j',
  status: 'IN_PROGRESS',
  type: 'EXPORT',
  ...overrides
})

describe('compareJobsByCreation', () => {
  test('orders by createdAt ascending (call order), not by job id', () => {
    // A release job triggered first (id "7") and an export job triggered later (id "3")
    // come from different queues with independent id counters. createdAt must win.
    const entries: [string, JobData][] = [
      ['3', job({ jobId: '3', type: 'EXPORT', createdAt: 2000 })],
      ['7', job({ jobId: '7', type: 'RELEASE', createdAt: 1000 })]
    ]

    const sorted = entries.sort(compareJobsByCreation).map(([id]) => id)

    expect(sorted).toEqual(['7', '3'])
  })

  test('keeps a stable, deterministic order across many interleaved queues', () => {
    const entries: [string, JobData][] = [
      ['5', job({ jobId: '5', createdAt: 300 })],
      ['1', job({ jobId: '1', createdAt: 100 })],
      ['2', job({ jobId: '2', createdAt: 400 })],
      ['9', job({ jobId: '9', createdAt: 200 })]
    ]

    const sorted = entries.sort(compareJobsByCreation).map(([id]) => id)

    expect(sorted).toEqual(['1', '9', '5', '2'])
  })

  test('falls back to numeric job id when createdAt is missing', () => {
    const entries: [string, JobData][] = [
      ['10', job({ jobId: '10' })],
      ['2', job({ jobId: '2' })]
    ]

    const sorted = entries.sort(compareJobsByCreation).map(([id]) => id)

    expect(sorted).toEqual(['2', '10'])
  })

  test('jobs with a createdAt sort after jobs that lack one (treated as 0)', () => {
    const entries: [string, JobData][] = [
      ['1', job({ jobId: '1', createdAt: 500 })],
      ['2', job({ jobId: '2' })]
    ]

    const sorted = entries.sort(compareJobsByCreation).map(([id]) => id)

    expect(sorted).toEqual(['2', '1'])
  })
})

describe('getReleaseRoute', () => {
  test('routes a VSP release to its value-set-packages detail page', () => {
    expect(
      getReleaseRoute({ basePath: '/value-set-packages', programId: 'hl7.fhir.us.core.6.1.0-2024-05' })
    ).toBe('/value-set-packages/hl7.fhir.us.core.6.1.0-2024-05')
  })

  test('defaults to the programs route when basePath is absent (program release)', () => {
    expect(getReleaseRoute({ programId: 'my-program' })).toBe('/programs/my-program')
  })

  test('handles missing metadata without throwing', () => {
    expect(getReleaseRoute(undefined)).toBe('/programs/')
    expect(getReleaseRoute({})).toBe('/programs/')
  })
})
