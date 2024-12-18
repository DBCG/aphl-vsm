import { Subject } from 'rxjs'
import JobHandler from '@/services/frontend/JobsService'
import subscribe from '@/utils/subscribe'
import { JOB_STATUS } from '@/constants'
import { Dispatch, SetStateAction } from 'react'
import { Jobs } from '@/types/jobTypes'

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

let uiListener: Subject<any> | null = null

const notifyUiListener = (nextState: Jobs) => {
  subject.next(nextState)
  if (uiListener !== null) {
    uiListener.next(nextState)
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
    subscribe(inProgressJobIds)
    subject.next(state)
  },
  listenForJob: (targetedJobId: string, callback: Function) => {
    uiListener = new Subject()
    uiListener.subscribe((jobs) => {
      for (const jobId in jobs) {
        if (jobId === targetedJobId) {
          callback(jobs[jobId])
        }
      }
    })
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
    uiListener = null
  },
  failedJob: (jobId: string, error: string) => {
    state[jobId] = { ...state[jobId], status: JOB_STATUS.FAILED, error }
    state = { ...state }
    notifyUiListener(state)
  },
  completedJobs: (jobIds: string[]) => {
    jobIds.forEach((jobId) => {
      state[jobId] = { ...state[jobId], status: JOB_STATUS.COMPLETED }
    })
    state = { ...state }
    notifyUiListener(state)
  },
  resubscribeJobs: async () => {
    // for resubscribing to all in progress jobs
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
