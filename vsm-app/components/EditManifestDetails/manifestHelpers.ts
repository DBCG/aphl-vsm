import {
  AvailableVersions,
  SelectedManifestDataVersion,
  ManifestSystemVersionPair,
  ManifestUrlNameMap,
  SystemSelection,
  UpdateManifest
} from '@/types/manifestTypes'
import { Dispatch, SetStateAction } from 'react'
import { toast } from 'react-toastify'

interface SearchAvailUpdates {
  programId: string
  currentSelectedData: SelectedManifestDataVersion
  systemAndVersionData: AvailableVersions
  setAvailableUpdates: Dispatch<SetStateAction<ManifestSystemVersionPair[]>> | Dispatch<SetStateAction<never[]>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>
  disableNotifications?: boolean
}

interface SearchAvailLeafUpdates {
  programId: string
  currentSelectedData: SelectedManifestDataVersion
  setAvailableLeafValueSetCodeSystems: Dispatch<SetStateAction<ManifestSystemVersionPair[]>> | Dispatch<SetStateAction<never[]>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>
}

const getIdFromSystem = (system: string): string => {
  return system?.split?.('/')?.slice?.(-1)?.[0] || ''
}

const namesByUri = (systemVersionData: SystemSelection[]) => {
  const result = {} as ManifestUrlNameMap
  if (systemVersionData.length) {
    systemVersionData.forEach((item) => {
      result[item.uri] = item.name
    })
  }
  return result
}

const getNameByUri = (uri: string, namesByUri: ManifestUrlNameMap): string => {
  const match = namesByUri[uri]
  return match || ''
}

const searchLeafValueSets = async ({
  programId,
  currentSelectedData,
  setAvailableLeafValueSetCodeSystems,
  setIsUpdating
}: SearchAvailLeafUpdates) => {
  const manifestEndpoint = `/api/programs/${programId}/manifest?leafValueSets=true`
  try {
    const response = await fetch(manifestEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const leafVSCodeSystemsRes = await response.json()

    if (!response.ok) {
      throw new Error(leafVSCodeSystemsRes.error)
    }
    const newCodeSystems: { system: string; version: string }[] = []
    leafVSCodeSystemsRes.forEach((i: any) => {
      const { system, version } = i
      const currentVersions = currentSelectedData[system]
      if (currentVersions == null) {
        newCodeSystems.push(i)
      } else {
        const hasSameVersion = currentVersions.includes(version)
        if (!hasSameVersion) {
          newCodeSystems.push(i)
        }
      }
    })
    // @ts-ignore
    setAvailableLeafValueSetCodeSystems(newCodeSystems)
    if (newCodeSystems.length === 0) {
      toast.info('No new CodeSystems from ValueSets found')
    }
  } catch (e: any) {
    console.error(e?.message)
    toast.error('Error: ' + e?.message)
  } finally {
    setIsUpdating(false)
  }
}

const searchAvailableUpdates = async ({
  programId,
  currentSelectedData,
  systemAndVersionData,
  setAvailableUpdates,
  setIsUpdating,
  disableNotifications = false
}: SearchAvailUpdates) => {
  if (!Object.keys(currentSelectedData).length) {
    setAvailableUpdates([])
    setIsUpdating(false)
    return
  }
  const manifestEndpoint = `/api/programs/${programId}/manifest`
  // Find all the latest versions for the chosen systems
  const availableLatestVersionsMap = {} as { [key: string]: string }
  Object.keys(currentSelectedData).forEach((system) => {
    if (system) {
      // @ts-ignore
      availableLatestVersionsMap[system] = systemAndVersionData.find((i: SystemSelection) => i.uri === system)?.latestVersion
    }
  })
  try {
    const mData = await fetch(manifestEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(availableLatestVersionsMap)
    }).then((res) => res.json())

    // Because VSAC versions in the metadata do not match the version listed on ValueSet we need to double check
    // that the versions we are offering to update are not already the latest
    const filteredAvailableVersions = mData.filter((i: { system: string; version: string }) => {
      const currentVersions = currentSelectedData[i?.system!]
      return !currentVersions?.includes(i?.version!)
    })

    if (filteredAvailableVersions.length === 0 && !disableNotifications) {
      toast.info('No new versions found')
    }

    setAvailableUpdates(filteredAvailableVersions)
  } catch (err) {
    console.error(err)
    toast.error('Error finding available updates')
  } finally {
    setIsUpdating(false)
  }
}

const updateManifest = async ({
  programId,
  setCurrentSelectedData,
  setIsUpdating,
  currentSelectedData,
  action,
  id,
  version,
  isVSP = false,
  activeTab
}: UpdateManifest) => {
  // Use correct endpoint based on resource type
  const baseEndpoint = isVSP ? 'value-set-packages' : 'programs'
  const manifestEndpoint = `/api/${baseEndpoint}/${programId}/manifest`

  try {
    const response = await fetch(manifestEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentSelectedData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Manifest update failed:', errorText)
      throw new Error(`Failed to update manifest: ${response.status}`)
    }

    const mData = await response.json()

    // For VSPs, the response is ExtendedManifestData { codeSystems, valueSets }
    // Extract the appropriate part based on active tab
    if (isVSP && activeTab) {
      const extractedData = activeTab === 'codesystems' ? mData.codeSystems : mData.valueSets
      setCurrentSelectedData(extractedData)
    } else {
      // For Programs, response is just SelectedManifestDataVersion
      setCurrentSelectedData(mData)
    }

    const resourceType = isVSP ? 'VSP' : 'program'
    const notificationTxt = `${action === 'add' ? 'Added ' : 'Deleted '} ${id || ''} ${version ? ` v. ${version}` : ''}`
    toast.success(notificationTxt, {
      style: { wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', textAlign: 'center' }
    })
  } catch (err) {
    console.error(err)
    const resourceType = isVSP ? 'VSP' : 'program'
    toast.error(`Error updating ${resourceType} manifest version`)
  } finally {
    setIsUpdating(false)
  }
}

export { searchAvailableUpdates, updateManifest, searchLeafValueSets, getIdFromSystem, namesByUri, getNameByUri }
