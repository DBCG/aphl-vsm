export interface JobData {
  jobId: string
  status: string
  metadata?: any
  type: string
  error?: string
}

export interface ExportJobMetadata {

}

export interface CompareJobMetadata {
  baseProgramId: string
  targetProgramId: string
  baseProgramLastUpdated: string
  targetProgramLastUpdated: string
}

export interface Jobs {
  [key: string]: JobData
}