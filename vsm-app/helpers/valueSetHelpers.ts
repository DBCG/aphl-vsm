import set from 'lodash.set'
import { terminologyServerEndpoints } from 'fhirClientOptions'

const addValueSetToGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let leafVSetsInGroup = vs?.compose?.include?.[0]?.valueSet || []
  if (!leafVSetsInGroup.length) {
    // need to make a new path
    const path = 'compose.include[0].valueSet'
    const valueToAdd = [vsCanonical]
    set(vs, path, valueToAdd)
  } else {
    if (!leafVSetsInGroup.includes(vsCanonical)) {
      leafVSetsInGroup.push(vsCanonical)
      if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
        vs.compose.include[0].valueSet = leafVSetsInGroup
      }
    }
  }
  return vs
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let leafVsInGroup = vs.compose?.include?.[0]?.valueSet
  if (leafVsInGroup) {
    const updatedLeafVsInGroup = vs?.compose?.include?.[0]?.valueSet
      ?.filter(leafCanonical => leafCanonical !== vsCanonical)

    if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
      vs.compose.include[0].valueSet = updatedLeafVsInGroup
    }
  } else {
    console.error('no leaf valuesets exist in this group')
  }
  return vs
}

// this only handles extensions with valueUri as type for now
const addExtensionToVs = (vs: fhir4.ValueSet, extensionUri: string, extensionValue: string): fhir4.ValueSet => {
  const valueToAdd = {
    url: extensionUri,
    valueUri: extensionValue
  }

  if (vs?.extension) {
    // if this extension already exists
    if (vs?.extension?.find(ext => ext?.url === extensionUri)) {
      return vs
    } else {
      vs.extension.push(valueToAdd)
    }
  } else {
    vs.extension = [valueToAdd]
  }
  return vs
}

const authoritativeSourceExtensionUrl = 'https://hl7.org/fhir/extension-valueset-authoritativesource.html'

interface TerminologyResult {
  value: string | undefined
  hasExtension: boolean
}

const getTerminologySource = (valueSet: fhir4.ValueSet): TerminologyResult => {
  const terminologyExt = valueSet?.extension?.find(ext => ext.url === authoritativeSourceExtensionUrl)
  if (terminologyExt) {
    const val = terminologyServerEndpoints?.find(endpoint => endpoint?.value?.url === terminologyExt?.valueUri)

    return {
      value: val?.label,
      hasExtension: true
    }
  } else {
    // check if valueset url shares a base url with one of the terminology servers
    // if so, use that as the return
    const valuesetServerBase = valueSet?.url?.split('/fhir/')?.[0]?.split('//')[1]

    if (valuesetServerBase) {
      const terminologyItem = terminologyServerEndpoints?.find(endpoint => endpoint?.value?.url?.includes(valuesetServerBase))
      return {
        value: terminologyItem?.label,
        hasExtension: false
      }
    } else {
      return {
        value: undefined,
        hasExtension: false
      }
    }
  }
}

// can't pass through whole valuesets -- node will error if data too large
// this fn pares down to a set of keys needed for display
const valuesetDataForDisplay = (valueset: fhir4.ValueSet) => {

  const allowedProperties = [
    'id', 'url', 'resourceType', 'version', 'date',
    'name', 'publisher', 'description', 'meta', 'useContext'
  ]

  const allKeys = Object.keys(valueset)

  const result = allKeys.reduce((next, key) => {
    if (allowedProperties.includes(key)) {
      return { ...next, [key]: valueset[key as keyof fhir4.ValueSet] }
    } else {
      return next
    }
  }, {})

  return result
}

export {
  addValueSetToGrouper,
  removeValueSetFromGrouper,
  addExtensionToVs,
  authoritativeSourceExtensionUrl,
  getTerminologySource,
  valuesetDataForDisplay
}