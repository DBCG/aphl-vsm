import { Jobs } from "@/types/jobTypes"
import { apiFetch } from '@/utils'

class JobsService {
  static async clearJobs() {
    return apiFetch('/api/jobs', { method: 'DELETE' })
  }

  static async getAllJobs(): Promise<Jobs> {
    const jobs = await apiFetch('/api/jobs').then((r) => r.json() as Promise<Jobs>)
    for (const jobId in jobs) {
      const job = jobs[jobId]
      if (job.metadata) {
        //@ts-ignore
        job.metadata = JSON.parse(job.metadata)
      }
    }
    return jobs
  }

  // Retrieves completed job result (uses type-aware endpoint to find the correct queue)
  static async getExportJob(jobId: string) {
    return apiFetch('/api/jobs/' + jobId + '/result').then((r) => r.json())
  }
}

export default JobsService
