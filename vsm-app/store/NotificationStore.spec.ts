import { JOB_STATUS } from '@/constants'

// Mock dependencies before importing NotificationStore
jest.mock('../utils', () => ({
  apiFetch: jest.fn()
}))

jest.mock('../utils/subscribe', () => jest.fn())

jest.mock('../services/frontend/JobsService', () => ({
  __esModule: true,
  default: {
    getAllJobs: jest.fn().mockResolvedValue({}),
    clearJobs: jest.fn().mockResolvedValue(undefined)
  }
}))

import NotificationStore from '@/store/NotificationStore'
import { apiFetch } from '@/utils'
import subscribe from '@/utils/subscribe'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NotificationStore', () => {
  describe('addJob', () => {
    test('adds a job and subscribes to it', async () => {
      await NotificationStore.addJob({
        jobId: 'job-1',
        jobType: 'EXPORT',
        metadata: { title: 'Test Export' } as any
      })

      expect(subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          jobIds: ['job-1']
        })
      )

      const job = NotificationStore.getJob('job-1')
      expect(job).toBeDefined()
      expect(job.status).toBe(JOB_STATUS.IN_PROGRESS)
      expect(job.type).toBe('EXPORT')
    })
  })

  describe('getJob', () => {
    test('returns a job by ID', async () => {
      await NotificationStore.addJob({
        jobId: 'job-get',
        jobType: 'EXPORT'
      })

      const job = NotificationStore.getJob('job-get')
      expect(job).toBeDefined()
      expect(job.jobId).toBe('job-get')
    })

    test('returns undefined for non-existent job', () => {
      const job = NotificationStore.getJob('nonexistent')
      expect(job).toBeUndefined()
    })
  })

  describe('completedJobs', () => {
    test('marks jobs as completed', async () => {
      await NotificationStore.addJob({
        jobId: 'job-complete',
        jobType: 'EXPORT'
      })

      NotificationStore.completedJobs(['job-complete'])

      const job = NotificationStore.getJob('job-complete')
      expect(job.status).toBe(JOB_STATUS.COMPLETED)
    })

    test('marks multiple jobs as completed', async () => {
      await NotificationStore.addJob({ jobId: 'job-c1', jobType: 'EXPORT' })
      await NotificationStore.addJob({ jobId: 'job-c2', jobType: 'EXPORT' })

      NotificationStore.completedJobs(['job-c1', 'job-c2'])

      expect(NotificationStore.getJob('job-c1').status).toBe(JOB_STATUS.COMPLETED)
      expect(NotificationStore.getJob('job-c2').status).toBe(JOB_STATUS.COMPLETED)
    })
  })

  describe('failedJob', () => {
    test('marks a job as failed with error message', async () => {
      await NotificationStore.addJob({
        jobId: 'job-fail',
        jobType: 'EXPORT'
      })

      NotificationStore.failedJob('job-fail', 'Something broke')

      const job = NotificationStore.getJob('job-fail')
      expect(job.status).toBe(JOB_STATUS.FAILED)
      expect(job.error).toBe('Something broke')
    })
  })

  describe('removeJob', () => {
    test('removes a job from state', async () => {
      await NotificationStore.addJob({
        jobId: 'job-remove',
        jobType: 'EXPORT'
      })

      expect(NotificationStore.getJob('job-remove')).toBeDefined()

      NotificationStore.removeJob('job-remove')

      expect(NotificationStore.getJob('job-remove')).toBeUndefined()
    })

    test('does not affect other jobs', async () => {
      await NotificationStore.addJob({ jobId: 'job-keep', jobType: 'EXPORT' })
      await NotificationStore.addJob({ jobId: 'job-drop', jobType: 'EXPORT' })

      NotificationStore.removeJob('job-drop')

      expect(NotificationStore.getJob('job-keep')).toBeDefined()
      expect(NotificationStore.getJob('job-drop')).toBeUndefined()
    })
  })

  describe('cancelJob', () => {
    test('cancels a job and updates state', async () => {
      ;(apiFetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      })

      await NotificationStore.addJob({
        jobId: 'job-cancel',
        jobType: 'EXPORT'
      })

      const result = await NotificationStore.cancelJob('job-cancel')

      expect(result).toBe(true)
      expect(apiFetch).toHaveBeenCalledWith('/api/jobs/job-cancel/cancel', { method: 'POST' })

      const job = NotificationStore.getJob('job-cancel')
      expect(job.status).toBe(JOB_STATUS.FAILED)
      expect(job.error).toBe('Cancelled by user')
    })

    test('returns false when cancel API returns failure', async () => {
      ;(apiFetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: false })
      })

      await NotificationStore.addJob({
        jobId: 'job-cancel-fail',
        jobType: 'EXPORT'
      })

      const result = await NotificationStore.cancelJob('job-cancel-fail')
      expect(result).toBe(false)
    })

    test('returns false on network error', async () => {
      ;(apiFetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await NotificationStore.cancelJob('job-network-fail')
      expect(result).toBe(false)
    })
  })

  describe('setMetadata', () => {
    test('updates job metadata', async () => {
      await NotificationStore.addJob({
        jobId: 'job-meta',
        jobType: 'EXPORT'
      })

      NotificationStore.setMetadata({
        'job-meta': { metadata: { title: 'Updated Title' } }
      })

      const job = NotificationStore.getJob('job-meta')
      expect(job.metadata).toEqual({ title: 'Updated Title' })
    })
  })

  describe('listenForJob', () => {
    test('returns a cleanup function', async () => {
      const cleanup = NotificationStore.listenForJob('job-listen', jest.fn())
      expect(typeof cleanup).toBe('function')
      cleanup() // Should not throw
    })

    test('calls callback when matching job updates', async () => {
      const callback = jest.fn()
      NotificationStore.listenForJob('job-listen-match', callback)

      // Trigger a state update that notifies listeners
      await NotificationStore.addJob({
        jobId: 'job-listen-match',
        jobType: 'EXPORT'
      })

      // Mark as completed (this calls notifyUiListener)
      NotificationStore.completedJobs(['job-listen-match'])

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('clearJobs', () => {
    test('clears all jobs and resets state', async () => {
      const JobHandler = require('../services/frontend/JobsService').default

      await NotificationStore.addJob({ jobId: 'job-clear1', jobType: 'EXPORT' })
      await NotificationStore.addJob({ jobId: 'job-clear2', jobType: 'EXPORT' })

      await NotificationStore.clearJobs()

      expect(JobHandler.clearJobs).toHaveBeenCalled()
      expect(NotificationStore.getJob('job-clear1')).toBeUndefined()
      expect(NotificationStore.getJob('job-clear2')).toBeUndefined()
    })
  })
})
