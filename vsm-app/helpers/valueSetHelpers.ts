import set from 'lodash.set'
import { cloneDeep } from 'lodash'
import { terminologyServerEndpoints } from '../fhirClientOptions'

const addValueSetToGrouper = (vs: fhir4.ValueSet, vsCanonicals: string[]): fhir4.ValueSet => {
  const vsClone = cloneDeep(vs)
  let leafVSetsInGroup = vsClone?.compose?.include?.map(item => item?.valueSet?.[0]).filter(x => x)
  const valuesToAdd = vsCanonicals.map(val => ({ valueSet: [val] }))

  // if no compose include & no leaf valuesets
  if (!vsClone?.compose?.include && !leafVSetsInGroup) {
    // need to make a new path because this obj location doesn't exist
    const path = 'compose.include[0]'

    set(vsClone, path, valuesToAdd)

  } else if (vsClone?.compose?.include) {
    vsCanonicals.forEach(canonical => {
      if (leafVSetsInGroup && !leafVSetsInGroup?.includes(canonical)) {
        leafVSetsInGroup.push(canonical)
        vsClone?.compose?.include?.push({ valueSet: [canonical] })
      }
    })
  }
  return vsClone
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let updatedComposeInclude = vs?.compose?.include?.map(item => {
    if (item?.valueSet?.includes(vsCanonical)) {
      return
    } else {
      return item
    }
  }).filter(x => x)

  if (updatedComposeInclude && vs?.compose?.include) {
    // @ts-ignore-next-line
    vs.compose.include = updatedComposeInclude
  } else {
    console.error('grouper does not have compose include')
  }
  return vs
}

// this only handles extensions with valueUri as type for now
const addExtensionToVs = (vs: fhir4.ValueSet, extensionUri: string, extensionValue: string): fhir4.ValueSet => {
  const vsClone = cloneDeep(vs)
  const valueToAdd = {
    url: extensionUri,
    valueUri: extensionValue
  }

  if (vsClone?.extension) {
    // if this extension already exists
    if (vsClone?.extension?.find(ext => ext?.url === extensionUri)) {
      return vsClone
    } else {
      vsClone.extension.push(valueToAdd)
    }
  } else {
    vsClone.extension = [valueToAdd]
  }
  return vsClone
}

const authoritativeSourceExtensionUrl = 'https://hl7.org/fhir/extension-valueset-authoritativeSource.html'
const expansionParameterUrl = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-expansion-parameters-extension'

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

const buildParametersParameter = (manifestDataMap: any) => {
  const parameters = [] as fhir4.ParametersParameter[]
  for (const [key, value] of Object.entries(manifestDataMap)) {
    // @ts-ignore
    value.forEach((v) => {
      parameters.push({
        name: 'system-version',
        valueString: `${key}|${v}`
      })
    })
  }
  return parameters
}

const setExpansionParameters = (library: fhir4.Library, manifestDataMap: any) => {
  const extension = library?.extension?.find(ext => ext.url === expansionParameterUrl)
  if (extension == null) {
    library.extension = [...(library?.extension || []), {
      "url" : "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-expansion-parameters-extension",
      "valueReference" : {
        "reference" : "#expansion-parameters-ecr"
      }
    }]
  }
  const parameter = buildParametersParameter(manifestDataMap)
  const parametersParameterResource = {
    "resourceType" : "Parameters",
    "id" : "expansion-parameters-ecr",
    "parameter": parameter, 
  } as fhir4.Parameters
  const filteredContain = library?.contained?.filter(resource => resource.id !== 'expansion-parameters-ecr') || [] // extract other contained resources
  filteredContain.push(parametersParameterResource)
  library.contained = filteredContain
}

const getExpansionParametersSystemVersion = (library: fhir4.Library) => {
  const parameterMap = {} as any
  const parameterResource = library?.contained?.find(resource => resource.id === 'expansion-parameters-ecr') as fhir4.Parameters
  const systemVersion = parameterResource?.parameter?.filter(i => i.name === 'system-version')
  systemVersion?.forEach((i) => {
    if (!i?.valueString) {
      return
    }
    const [system, version] = decodeURI(i.valueString).split('|') || []
    if (parameterMap[system]) {
      parameterMap[system].push(version)
    } else {
      parameterMap[system] = [version]
    }
  })
  return parameterMap
}


export {
  addExtensionToVs,
  addValueSetToGrouper,
  authoritativeSourceExtensionUrl,
  getExpansionParametersSystemVersion,
  getTerminologySource,
  removeValueSetFromGrouper,
  setExpansionParameters,
  valuesetDataForDisplay
}