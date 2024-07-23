export interface GroupInfoItem {
  label: string
  value: string
}

export interface GroupUpdateItem {
  leafCanonical?: string
  leafVersion?: string | undefined
  priority?: string
  groupInfo?: GroupInfoItem[]
}

interface GrouperInfo {
  canonical: string
  id: string
}

export interface DeleteParams {
  vsCanonical: string | undefined
  grouperInfo: GrouperInfo[]
}

export interface GroupItem {
  id: string
  title: string
  url: string
}

export interface TerminologyResult {
  value: string
  hasExtension: boolean
}

export interface TableRow {
  programName: string
  programId: string
  programStatus: string
  canonical: string
  title: string
  version: string
  publisher: string
  valueSet: fhir4.ValueSet
  groups: GroupItem[]
  valueSetPinnedVersion?: string
}
