import { of, timer } from 'rxjs'
import { switchMap, catchError, takeWhile } from 'rxjs/operators'
import NotificationStore from '@/store/NotificationStore'
import { JOB_STATUS } from '@/constants'
import { toast } from 'react-toastify'
import { Jobs } from '@/types/jobTypes'
// Function to subscribe to polling

const defaultOnSuccess = () => toast.success('Job completed successfully')

type SubscribeProps = {
  jobIds: string[]
  onSuccess?: any
  setMetaData?: any
  onFailure?: any
}

const subscribe = ({ jobIds, onSuccess = defaultOnSuccess, setMetaData = () => {}, onFailure = () => {} }: SubscribeProps) => {
  if (!jobIds.length) return
  // Create an observable for polling
  const polling$ = timer(0, 5000).pipe(
    switchMap(() =>
      fetch(`/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobIds)
      })
        .then(async (response) => {
          const res = await response.json()
          setMetaData(res)
          return res
        })
        .catch((error) => {
          throw error // Handle fetch error
        })
    ),
    takeWhile(
      (jobs: Jobs) =>
        // Keep polling if any job is still in progress
        Object.values(jobs)?.find((job) => job?.status === JOB_STATUS.IN_PROGRESS) != null,
      true
    ),
    catchError((error) => {
      console.error('Something went wrong', error)
      onFailure(error)
      return of(null) // Complete the observable if there's an error
    })
  )

  const pollingDecision = (jobId: string, status: string, error: string) => {
    if (status === JOB_STATUS.FAILED) {
      onFailure(error)
      NotificationStore.failedJob(jobId, error)
      return false
    } else if (status === JOB_STATUS.COMPLETED) {
      onSuccess()
      NotificationStore.completedJobs(jobIds) // completedJobs takes an array of ids
      return false
    } else {
      // Job is still in progress exit out
      return true
    }
  }

  // Subscribe to the observable
  const subscription = polling$.subscribe((jobs) => {
    if (jobs == null) return // Exit on error
    const currentJobIds = Object.keys(jobs) || []
    if (currentJobIds.length === 1) {
      // Handle case of single job polling

      const jobId = currentJobIds[0]
      const jobDetails = jobs[jobId]
      // Update status or handle completion
      const shouldContinue = pollingDecision(jobId, jobDetails?.status, jobDetails?.error! || '')
      if (!shouldContinue) {
        subscription.unsubscribe() // Stop polling
      }
    } else if (currentJobIds.length > 1) {
      // Handle case of polling multiple jobs
      const completedJobs = [] as string[]
      const failedJobs = [] as any[]

      Object.values(jobs).forEach((job) => {
        if (job.status === JOB_STATUS.COMPLETED) {
          completedJobs.push(job.jobId)
        } else if (job.status === JOB_STATUS.FAILED) {
          failedJobs.push(job, job?.error! || 'Unknown error')
        }
      })

      if (completedJobs.length === 0 && failedJobs.length === 0) {
        return
      }

      if (completedJobs.length > 0) {
        NotificationStore.completedJobs(completedJobs)
        toast.success('Job completed successfully')
      }
      if (failedJobs.length > 0) {
        failedJobs.forEach((job) => {
          NotificationStore.failedJob(job.jobId, job?.error! || 'Unknown error')
        })
        toast.success('Job failed')
      }
      subscription.unsubscribe() // Stop polling
      if (completedJobs.length + failedJobs.length !== currentJobIds.length) {
        NotificationStore.resubscribeJobs() // Resubscribe to all in progress jobs
      }
    }
  })
}

export default subscribe
