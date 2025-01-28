import { Jobs } from "@/types/jobTypes"

class JobsService {
  static async clearJobs() {
    return fetch('/api/jobs', { method: 'DELETE' })
  }

  static async getAllJobs(): Promise<Jobs> {
    const jobs = await fetch('/api/jobs').then((r) => r.json() as Promise<Jobs>)
    for (const jobId in jobs) {
      const job = jobs[jobId]
      if (job.metadata) {
        job.metadata = JSON.parse(job.metadata as string)
      }
    }
    return jobs
  }

  // Checks for job status
  static async getJob(jobId: string) {
    return fetch('/api/jobs/' + jobId).then((r) => r.json())
  }
}

export default JobsService
