export interface JobData {
  jobId: string
  status: string
  metadata?: any
  type: string
  error?: string
}

export interface ExportJobMetadata {
  programId: string
  version: string
  hasCustomPlanDefinition: boolean
  filename: string
  isJson: boolean
  programTitle: string
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
