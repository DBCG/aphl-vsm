export interface GroupInfoItem {
  label: string,
  value: string
}

export interface GroupUpdateItem {
  canonical?: string,
  groupInfo?: GroupInfoItem[]
}

export interface DeleteParams {
  vsCanonical: string | undefined,
  grouperCanonicals: string[] | undefined
}

export interface GroupItem {
  id: string,
  title: string,
  url: string
}

export interface TableRow {
  programName: string
  programId: string
  programStatus: string
  canonical: string
  title: string
  version: string
  valueSet: fhir4.ValueSet
  groups: GroupItem[]
}