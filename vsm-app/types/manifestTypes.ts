interface SystemSelection {
  name: string
  uri: string
}

interface ResultMap {
  [key: string]: string
}

interface ManifestDataMap {
  [key: string]: string[]
}

interface UpdateManifest {
  currentSelectedData: ManifestDataMap
  action: 'add' | 'delete'
  id?: string
  version?: string
}

interface ManifestSystemVersionPair {
  system: string
  version: string
  id: string
}

export type {
  SystemSelection,
  ResultMap,
  ManifestDataMap,
  UpdateManifest,
  ManifestSystemVersionPair
}