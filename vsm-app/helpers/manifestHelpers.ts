import { AvailableVersions, ManifestDataMap, SystemSelection, UpdateManifest } from '@/types/manifestTypes'
import { Dispatch, SetStateAction } from 'react'
import { toast } from 'react-toastify'

interface SearchAvailUpdates {
  programId: string
  currentSelectedData: ManifestDataMap
  systemAndVersionData: AvailableVersions
  setAvailableUpdates: Dispatch<SetStateAction<fhir4.CodeSystem[]>> | Dispatch<SetStateAction<never[]>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>
}

interface SearchAvailLeafUpdates {
  programId: string
  currentSelectedData: ManifestDataMap
  setAvailableLeafValueSetCodeSystems: Dispatch<SetStateAction<fhir4.CodeSystem[]>> | Dispatch<SetStateAction<never[]>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>
}

const searchLeafValueSets = async ({
  programId,
  currentSelectedData,
  setAvailableLeafValueSetCodeSystems,
  setIsUpdating
}: SearchAvailLeafUpdates) => {
  const manifestEndpoint = `/api/programs/${programId}/manifest?leafValueSets=true`
  try {
    const leafVSCodeSystems = await fetch(manifestEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then((res) => res.json())

    const newCodeSystems: { system: string; version: string }[] = []
    leafVSCodeSystems.forEach((i) => {
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
    setAvailableLeafValueSetCodeSystems(newCodeSystems)
    if (newCodeSystems.length === 0) {
      toast.info('No new CodeSystems from ValueSets found')
    }
  } catch (e) {
    console.error(e)
    toast.error('Error finding available updates')
  } finally {
    setIsUpdating(false)
  }
}

const searchAvailableUpdates = async ({
  programId,
  currentSelectedData,
  systemAndVersionData,
  setAvailableUpdates,
  setIsUpdating
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
  version
}: UpdateManifest) => {
  const manifestEndpoint = `/api/programs/${programId}/manifest`
  try {
    const mData = await fetch(manifestEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentSelectedData)
    }).then((res) => res.json())
    setCurrentSelectedData(mData)
    const notificationTxt = `${action === 'add' ? 'Added ' : 'Deleted '} ${id || ''} ${version ? ` v. ${version}` : ''}`
    toast.success(notificationTxt)
  } catch (err) {
    console.error(err)
    toast.error('Error adding manifest program version')
  } finally {
    setIsUpdating(false)
  }
}

export { searchAvailableUpdates, updateManifest, searchLeafValueSets }
