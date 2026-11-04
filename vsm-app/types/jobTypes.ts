export interface JobData {
  jobId: string
  status: "FAILED" | "COMPLETED" | "IN_PROGRESS";
  metadata?: ExportJobMetadata | CompareJobMetadata | ReleaseJobMetadata | DependencyJobMetadata
  type: string
  error?: string
  // Epoch ms when the job was created; used to order the notification queue by call order
  createdAt?: number
}

export interface ExportJobMetadata {
  programId: string
  filename: string
  fileType: 'csv' | 'json' | 'xml'
  programTitle: string
  // The artifact's semantic version (e.g. a VSP's 2024-05)
  programVersion?: string
}

export interface ReleaseJobMetadata {
  programId: string
  programTitle: string
  latestFromTxServer: boolean
  // The artifact's version being released (e.g. a VSP's 2024-05)
  version?: string
  // Route prefix for the completion link: '/programs' (default) or '/value-set-packages'
  basePath?: string
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
