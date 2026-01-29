export interface JobData {
  jobId: string
  status: "FAILED" | "COMPLETED" | "IN_PROGRESS";
  metadata?: ExportJobMetadata | CompareJobMetadata | ReleaseJobMetadata | DependencyJobMetadata
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

export interface DependencyJobMetadata {
  igCanonical: string
  igPackageId: string
  igName?: string
  igTitle?: string
  manifestData?: any
  source?: string
  warnings?: string[]
}

export interface Jobs {
  [key: string]: JobData
}
