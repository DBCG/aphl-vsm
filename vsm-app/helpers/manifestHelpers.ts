import { AvailableVersions, ManifestDataMap, SystemSelection, UpdateManifest } from '@/types/manifestTypes'
import { Dispatch, SetStateAction } from 'react'
import { toast } from 'react-toastify'

interface SearchAvailUpdates {
  programId: string,
  currentSelectedData: ManifestDataMap
  systemAndVersionData: AvailableVersions
  setAvailableUpdates: Dispatch<SetStateAction<fhir4.CodeSystem[]>> | Dispatch<SetStateAction<never[]>>
  setIsUpdating: Dispatch<SetStateAction<boolean>>
}

const searchAvailableUpdates = async ({
  programId,
  currentSelectedData,
  systemAndVersionData,
  setAvailableUpdates,
  setIsUpdating
}: SearchAvailUpdates) => {
  if(!Object.keys(currentSelectedData).length) {
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
    const filteredAvailableVersions = mData.filter((i: fhir4.ValueSet) => {
      const currentVersions = currentSelectedData[i?.url!]
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
  version,
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

export { searchAvailableUpdates, updateManifest }