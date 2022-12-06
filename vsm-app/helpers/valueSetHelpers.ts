import set from 'lodash.set'
import { terminologyServerEndpoints } from '../fhirClientOptions'

const addValueSetToGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let leafVSetsInGroup = vs?.compose?.include?.map((item) => item?.valueSet?.[0]).filter((x) => !!x)
  const valueToAdd = [vsCanonical]
  // if no compose include & no leaf valuesets
  if (!vs?.compose?.include && !leafVSetsInGroup) {
    // need to make a new path
    const path = 'compose.include[0].valueSet' // make this more flexible?
    // what if something in compose.include that isn't valueset in the future
    set(vs, path, valueToAdd)
    // if some vsets exist, but not
  } else if (vs?.compose?.include) {
    if (leafVSetsInGroup && !leafVSetsInGroup?.includes(vsCanonical)) {
      leafVSetsInGroup.push(vsCanonical)
      vs.compose.include.push({ valueSet: valueToAdd })
    }
  }
  return vs
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let updatedComposeInclude = vs?.compose?.include
    ?.map((item) => {
      if (item?.valueSet?.includes(vsCanonical)) {
        return
      } else {
        return item
      }
    })
    .filter((x) => !!x)

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
  const valueToAdd = {
    url: extensionUri,
    valueUri: extensionValue
  }

  if (vs?.extension) {
    // if this extension already exists
    if (vs?.extension?.find((ext) => ext?.url === extensionUri)) {
      return vs
    } else {
      vs.extension.push(valueToAdd)
    }
  } else {
    vs.extension = [valueToAdd]
  }
  return vs
}

const authoritativeSourceExtensionUrl = 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource'
const expansionParameterUrl = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-expansion-parameters-extension'

interface TerminologyResult {
  value: string | undefined
  hasExtension: boolean
}

const getTerminologySource = (valueSet: fhir4.ValueSet): TerminologyResult => {
  const terminologyExt = valueSet?.extension?.find((ext) => ext.url === authoritativeSourceExtensionUrl)
  if (terminologyExt) {
    const val = terminologyServerEndpoints?.find((endpoint) => endpoint?.value?.url === terminologyExt?.valueUri)

    return {
      value: val?.label,
      hasExtension: true
    }
  } else {
    // if no other choice, INFER the terminology server
    // check if valueset url shares a base url with one of the terminology servers
    // if so, use that as the return
    const valuesetServerBase = valueSet?.url?.split('/fhir/')?.[0]?.split('//')[1]

    if (valuesetServerBase) {
      const terminologyItem = terminologyServerEndpoints?.find((endpoint) => endpoint?.value?.url?.includes(valuesetServerBase))
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
  const allowedProperties = ['id', 'url', 'resourceType', 'version', 'date', 'name', 'publisher', 'description', 'meta', 'useContext']

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
  const extension = library?.extension?.find((ext) => ext.url === expansionParameterUrl)
  if (extension == null) {
    library.extension = [
      ...(library?.extension || []),
      {
        url: 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-expansion-parameters-extension',
        valueReference: {
          reference: '#expansion-parameters-ecr'
        }
      }
    ]
  }
  const parameter = buildParametersParameter(manifestDataMap)
  const parametersParameterResource = {
    resourceType: 'Parameters',
    id: 'expansion-parameters-ecr',
    parameter: parameter
  } as fhir4.Parameters
  const filteredContain = library?.contained?.filter((resource) => resource.id !== 'expansion-parameters-ecr') || [] // extract other contained resources
  filteredContain.push(parametersParameterResource)
  library.contained = filteredContain
}

const getExpansionParametersSystemVersion = (library: fhir4.Library) => {
  const parameterMap = {} as any
  const parameterResource = library?.contained?.find((resource) => resource.id === 'expansion-parameters-ecr') as fhir4.Parameters
  const systemVersion = parameterResource?.parameter?.filter((i) => i.name === 'system-version')
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


// update grouper valueset with proper version
const updateLeafVsVersion = (vs: fhir4.ValueSet, canonicalToUpdate: string, version: string): fhir4.ValueSet => {
  // ensure canonical doesn't have attached version
  const canonicalWithoutVersion = canonicalToUpdate?.split('|')?.[0]
  // need to deep copy?
  const composeInclude = vs.compose.include
  const newCanonical = version === 'latest' ? canonicalWithoutVersion : `${canonicalWithoutVersion}|${version}`

  composeInclude?.forEach(item => {
    const match = item?.valueSet?.find(canonical => canonical?.includes(canonicalWithoutVersion))
    if (match) {
      item.valueSet = [newCanonical]
    }
  })

  vs.compose.include = composeInclude

  return vs
}

export {
  addExtensionToVs,
  addValueSetToGrouper,
  authoritativeSourceExtensionUrl,
  getExpansionParametersSystemVersion,
  getTerminologySource,
  removeValueSetFromGrouper,
  setExpansionParameters,
  valuesetDataForDisplay,
  updateLeafVsVersion
}
