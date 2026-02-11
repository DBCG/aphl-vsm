import { Subject } from 'rxjs'
import JobHandler from '@/services/frontend/JobsService'
import subscribe from '@/utils/subscribe'
import { JOB_STATUS } from '@/constants'
import { Dispatch, SetStateAction } from 'react'
import { CompareJobMetadata, ExportJobMetadata, Jobs, ReleaseJobMetadata } from '@/types/jobTypes'

type AddJobParams = {
  jobId: string
  jobType: string
  metadata?: ExportJobMetadata | CompareJobMetadata | ReleaseJobMetadata
  onSuccess?: (arg?: any) => void
  onFailure?: (error: string) => void
  updateStatus?: (status: string) => void
}

const subject = new Subject()

let state = {} as Jobs

let uiListener: Subject<any> | null = null

const notifyUiListener = (nextState: Jobs) => {
  subject.next(nextState)
  if (uiListener !== null) {
    console.log('[NotificationStore] notifyUiListener: Broadcasting to uiListener', Object.keys(nextState))
    uiListener.next(nextState)
  } else {
    console.log('[NotificationStore] notifyUiListener: No uiListener registered')
  }
}

const NotificationStore = {
  init: async () => {
    state = await JobHandler.getAllJobs()
    // get all jobs in progress
    const inProgressJobIds = Object.values(state)
      .filter((job) => job.status === JOB_STATUS.IN_PROGRESS)
      .map((job) => job.jobId)
    // subscribe to all in progress jobs
    subscribe({ jobIds: inProgressJobIds })
    subject.next(state)
  },
  listenForJob: (targetedJobId: string, callback: Function) => {
    console.log(`[NotificationStore] listenForJob called for jobId: ${targetedJobId}`)

    // Create a new listener if it doesn't exist
    if (!uiListener) {
      console.log('[NotificationStore] Creating new uiListener Subject')
      uiListener = new Subject()
    }

    // Subscribe and return cleanup function
    const subscription = uiListener.subscribe((jobs) => {
      console.log(`[NotificationStore] uiListener received update, checking for job: ${targetedJobId}`, Object.keys(jobs))
      for (const jobId in jobs) {
        if (jobId === targetedJobId) {
          console.log(`[NotificationStore] Found matching job ${targetedJobId}, status: ${jobs[jobId]?.status}`)
          callback(jobs[jobId])
        }
      }
    })

    // Return cleanup function
    return () => {
      console.log(`[NotificationStore] Cleaning up listener for job: ${targetedJobId}`)
      subscription.unsubscribe()
    }
  },
  addJob: async ({ jobId, jobType, metadata, onSuccess, onFailure, updateStatus }: AddJobParams) => {
    subscribe({
      jobIds: [jobId],
      onSuccess,
      setMetaData: NotificationStore.setMetadata,
      onFailure
    })
    state = {
      ...state,
      [jobId]: { jobId, status: JOB_STATUS.IN_PROGRESS, metadata, type: jobType }
    }
    subject.next(state)
  },
  setMetadata: (input: Jobs = {}) => {
    const jobDetails = Object.values(input)?.[0]
    const jobId = Object.keys(input)?.[0]
    state = {
      ...state,
      [jobId]: { ...state[jobId], metadata: jobDetails?.metadata }
    }
    subject.next(state)
  },
  getJob: (jobId: string) => state[jobId],
  clearJobs: async () => {
    await JobHandler.clearJobs()
    state = {}
    subject.next(state)
    uiListener = null
  },
  removeJob: (jobId: string) => {
    const { [jobId]: removed, ...rest } = state
    state = rest
    subject.next(state)
  },
  cancelJob: async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        // Update job status to failed with cancellation message
        state[jobId] = { ...state[jobId], status: JOB_STATUS.FAILED, error: 'Cancelled by user' }
        state = { ...state }
        notifyUiListener(state)
        return true
      }
      return false
    } catch (error) {
      console.error('Error cancelling job:', error)
      return false
    }
  },
  failedJob: (jobId: string, error: string) => {
    state[jobId] = { ...state[jobId], status: JOB_STATUS.FAILED, error }
    state = { ...state }
    notifyUiListener(state)
  },
  completedJobs: (jobIds: string[]) => {
    console.log('[NotificationStore] Marking jobs as completed:', jobIds)
    jobIds.forEach((jobId) => {
      state[jobId] = { ...state[jobId], status: JOB_STATUS.COMPLETED }
      console.log(`[NotificationStore] Job ${jobId} marked as COMPLETED`)
    })
    state = { ...state }
    console.log('[NotificationStore] Notifying UI listeners with updated state')
    notifyUiListener(state)
  },
  resubscribeJobs: async () => {
    // for resubscribing to all in progress jobs
    const inProgressJobIds = Object.values(state)
      .filter((job) => job.status === JOB_STATUS.IN_PROGRESS)
      .map((job) => job.jobId)
    // re-subscribe to all in progress jobs
    subscribe({ jobIds: inProgressJobIds })
  },
  // @ts-ignore
  subscribe: (setState: Dispatch<SetStateAction<Jobs>>) => subject.subscribe(setState)
}

export default NotificationStore
