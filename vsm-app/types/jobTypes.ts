export interface JobData {
  jobId: string
  status: "FAILED" | "COMPLETED" | "IN_PROGRESS";
  metadata: ExportJobMetadata | CompareJobMetadata | ReleaseJobMetadata
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

export interface ReleaseJobMetadata {
  programId: string
  programTitle: string
  latestFromTxServer: boolean
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
