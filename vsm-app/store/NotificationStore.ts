import { Subject } from 'rxjs'
import JobHandler from '@/services/frontend/JobsService'
import type { JobData, Jobs } from '@/services/frontend/JobsService'
import subscribe from '@/utils/subscribe'
import { JOB_STATUS } from '@/constants'
import { Dispatch, SetStateAction } from 'react'

type AddJobParams = {
  jobId: string
  jobType: string
  metadata?: any
  onSuccess?: (arg?: any) => void
  onFailure?: (error: string) => void
  updateStatus?: (status: string) => void
}

const subject = new Subject()

let state = {} as Jobs

const NotificationStore = {
  init: async () => {
    state = await JobHandler.getAllJobs()
    // get all jobs in progress
    const inProgressJobIds = Object.values(state)
      .filter((job) => job.status === JOB_STATUS.IN_PROGRESS)
      .map((job) => job.jobId)
    // subscribe to all in progress jobs
    subscribe(inProgressJobIds)
    subject.next(state)
  },
  addJob: ({ jobId, jobType, metadata = {}, onSuccess, onFailure, updateStatus }: AddJobParams) => {
    subscribe([jobId], onSuccess, onFailure)
    state = {
      ...state,
      [jobId]: { jobId, status: JOB_STATUS.IN_PROGRESS, metadata, type: jobType }
    }
    subject.next(state)
  },
  getJob: (jobId: string) => state[jobId],
  clearJobs: async () => {
    await JobHandler.clearJobs()
    state = {}
    subject.next(state)
  },
  failedJob: (jobId: string, error: string) => {
    state[jobId] = { ...state[jobId], status: JOB_STATUS.FAILED, error }
    state = { ...state }
    subject.next(state)
  },
  completedJobs: (jobIds: string[]) => {
    jobIds.forEach((jobId) => {
      state[jobId] = { ...state[jobId], status: JOB_STATUS.COMPLETED }
    })
    state = { ...state }
    subject.next(state)
  },
  resubscribeJobs: async () => { // for resubscribing to all in progress jobs
    const inProgressJobIds = Object.values(state)
      .filter((job) => job.status === JOB_STATUS.IN_PROGRESS)
      .map((job) => job.jobId)
    // re-subscribe to all in progress jobs
    subscribe(inProgressJobIds)
  },
  // @ts-ignore
  subscribe: (setState: Dispatch<SetStateAction<Jobs>>) => subject.subscribe(setState)
}

export default NotificationStore
