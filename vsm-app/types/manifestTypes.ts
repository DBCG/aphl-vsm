import { Dispatch, SetStateAction } from 'react'

interface SystemSelection {
  name: string
  uri: string
}

interface AvailableVersionItem {
  name: string
  uri: string
  latestVersion: string
}

type AvailableVersions = AvailableVersionItem[]

interface ManifestDataMap {
  [key: string]: ManifestData[]
}

interface SelectedManifestDataVersion {
  [key: string]: string[]
}

interface ManifestData {
  id: string
  date: string
  version: string
}

interface ManifestUrlNameMap {
  [url: string]: string
}

interface UpdateManifest {
  currentSelectedData: ManifestDataMap
  action: 'add' | 'delete'
  id?: string
  version?: string
  programId: string
  setCurrentSelectedData: Dispatch<SetStateAction<ManifestDataMap>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>

}

interface ManifestSystemVersionPair {
  system: string
  version: string
  id?: string
}

export type {
  SystemSelection,
  ManifestDataMap,
  SelectedManifestDataVersion,
  ManifestData,
  UpdateManifest,
  ManifestSystemVersionPair,
  ManifestUrlNameMap,
  AvailableVersions
}