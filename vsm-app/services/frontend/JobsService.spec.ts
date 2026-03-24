import { apiFetch } from '@/utils'

jest.mock('../../utils', () => ({
  apiFetch: jest.fn()
}))

import JobsService from '@/services/frontend/JobsService'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('JobsService', () => {
  describe('getAllJobs', () => {
    test('fetches and returns jobs', async () => {
      const mockJobs = {
        'job-1': { jobId: 'job-1', status: 'COMPLETED', type: 'EXPORT' },
        'job-2': { jobId: 'job-2', status: 'IN_PROGRESS', type: 'CHANGE_LOG' }
      }

      ;(apiFetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockJobs)
      })

      const result = await JobsService.getAllJobs()
      expect(apiFetch).toHaveBeenCalledWith('/api/jobs')
      expect(result['job-1'].jobId).toBe('job-1')
      expect(result['job-2'].jobId).toBe('job-2')
    })

    test('parses metadata JSON strings', async () => {
      const mockJobs = {
        'job-1': {
          jobId: 'job-1',
          status: 'COMPLETED',
          type: 'EXPORT',
          metadata: '{"title":"Test Export","programId":"prog-1"}'
        }
      }

      ;(apiFetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockJobs)
      })

      const result = await JobsService.getAllJobs()
      expect(result['job-1'].metadata).toEqual({ title: 'Test Export', programId: 'prog-1' })
    })

    test('handles jobs without metadata', async () => {
      const mockJobs = {
        'job-1': { jobId: 'job-1', status: 'COMPLETED', type: 'EXPORT' }
      }

      ;(apiFetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockJobs)
      })

      const result = await JobsService.getAllJobs()
      expect(result['job-1'].metadata).toBeUndefined()
    })
  })

  describe('clearJobs', () => {
    test('sends DELETE request to /api/jobs', async () => {
      ;(apiFetch as jest.Mock).mockResolvedValue({})

      await JobsService.clearJobs()
      expect(apiFetch).toHaveBeenCalledWith('/api/jobs', { method: 'DELETE' })
    })
  })

  describe('getExportJob', () => {
    test('fetches job by ID', async () => {
      const mockJob = { jobId: 'job-123', status: 'COMPLETED' }
      ;(apiFetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockJob)
      })

      const result = await JobsService.getExportJob('job-123')
      expect(apiFetch).toHaveBeenCalledWith('/api/jobs/job-123/result')
      expect(result.jobId).toBe('job-123')
    })
  })
})
