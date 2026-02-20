import { Dispatch, SetStateAction } from 'react'
import type { ExtendedManifestData } from './vspTypes'

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
  currentSelectedData: SelectedManifestDataVersion | ExtendedManifestData  // Can be either for Programs or VSPs
  action: 'add' | 'delete'
  id?: string
  version?: string
  programId: string
  setCurrentSelectedData: Dispatch<SetStateAction<SelectedManifestDataVersion>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>
  isVSP?: boolean  // NEW: Indicates if updating VSP manifest
  activeTab?: string  // NEW: For VSPs, indicates which tab (codesystems/valuesets) is active
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