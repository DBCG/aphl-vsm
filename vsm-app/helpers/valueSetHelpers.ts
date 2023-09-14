import set from 'lodash.set'
import cloneDeep from 'lodash.clonedeep'
import { terminologyServerEndpoints } from '../fhirClientOptions'
import { grouperValueSetBase } from '../helpers/server/grouperValueSetBase'
import { GrouperMetadata } from '@/types/grouperTypes'
import { TerminologyResult } from '@/types/valuesets'
import { ManifestDataMap } from '@/types/manifestTypes'
import { setExtension } from './fhirResourceHelper'

const EXTENSIONS = {
  VALUESET_KEYWORD: 'http://hl7.org/fhir/StructureDefinition/valueset-keyWord'
}

const addValueSetToGrouper = (vs: fhir4.ValueSet, leafVsCanonical: string | string[]): fhir4.ValueSet => {
  if (!leafVsCanonical || leafVsCanonical.length === 0) {
    console.error('missing leaf to add')
    return vs
  }
  const valueSetToUpdate = cloneDeep(vs)
  if (typeof leafVsCanonical === 'string') {
    leafVsCanonical = [leafVsCanonical]
  }

  // get all of the leafs currently within the grouper
  let leafVSetsAlreadyInGroup = Array.from(
    new Set(valueSetToUpdate?.compose?.include?.map((item) => item?.valueSet?.[0]).filter((x) => !!x))
  )

  const composeIncludeToAdd = valueSetToUpdate?.compose?.include || []

  leafVsCanonical.forEach((url) => {
    if (!leafVSetsAlreadyInGroup?.includes(url)) {
      composeIncludeToAdd.push({ valueSet: [url] })
    }
  })

  set(valueSetToUpdate, 'compose.include', composeIncludeToAdd)

  return valueSetToUpdate
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

const getProgramManifestVersions = (library: fhir4.Library) => {
  const parameterMap: ManifestDataMap = {}
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
  const vsCopy = cloneDeep(vs)
  // ensure canonical doesn't have attached version
  const canonicalWithoutVersion = canonicalToUpdate?.split('|')?.[0]

  const composeInclude = vs.compose!.include!
  const newCanonical = version === 'latest' ? canonicalWithoutVersion : `${canonicalWithoutVersion}|${version}`

  composeInclude?.forEach((item) => {
    const match = item?.valueSet?.find((canonical) => canonical?.includes(canonicalWithoutVersion))
    if (match) {
      item.valueSet = [newCanonical]
    }
  })

  vsCopy!.compose!.include = composeInclude
  return vsCopy
}

const createGrouperWithMetadata = (metadata: GrouperMetadata, template?: fhir4.ValueSet) => {
  const baseGrouper = template || grouperValueSetBase
  const templateVS = cloneDeep(baseGrouper) as fhir4.ValueSet

  const { author, ...rest } = metadata

  // apply all fields that are flat
  const vs = Object.assign({}, templateVS, rest, { url: `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/ValueSet/${metadata.name?.replace(' ', '')}` })

  // apply extension
  vs.extension = [
    {
      url: `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/StructureDefinition/valueset-author`,
      valueContactDetail: {
        name: author
      }
    }
  ]
  return vs
}

interface GrouperUpdateMetadata {
  vsToUpdate: fhir4.ValueSet
  metadata: {
    version?: string
    publisher?: string
    author?: string
    purpose?: string
    desription?: string
  }
}

const updateGrouperWithMetadata = ({ vsToUpdate, metadata }: GrouperUpdateMetadata) => {
  const newVs = cloneDeep(vsToUpdate)
  const { author, ...rest } = metadata

  if (author) {
    if (!newVs.extension) {
      newVs.extension = []
    }

    const authorExtension = {
      url: `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/StructureDefinition/valueset-author`,
      valueContactDetail: {
        name: author
      }
    }

    const existingIndex = newVs.extension.findIndex((ext) => ext?.url?.endsWith('/StructureDefinition/valueset-author'))
    // if the extension does not exist already
    if (existingIndex === -1) {
      newVs.extension.push(authorExtension)
    } else {
      newVs.extension[existingIndex] = authorExtension
    }
  }

  // add all fields that are simple obj.assign
  // if ...rest doesn't contain anything, it defaults to {}
  return Object.assign(newVs, rest)
}

const urlWithoutVersion = (url: string) => url?.split?.('-')?.[0]

// VSAC appends versions to valueset ids and urls with hyphen
// this returns only the OID w/o version
const idWithoutVersion = (url: string) => {
  if (url?.includes('|')) {
    return url?.split('|')[0]
  } else {
    const splitPaths = url?.split('/') || []
    // get last part of url
    const vsIdWithVersion = splitPaths?.pop() as string
    return urlWithoutVersion(vsIdWithVersion)
  }
}

const getOid = (vs: fhir4.ValueSet) => {
  let oid = vs?.identifier?.[0]?.value
  if (!oid && vs?.url) {
    // extract oid out of end of url
    const url = vs?.url.split('/').pop() as string
    oid = url?.includes('|') ? url.split('|')[0] : idWithoutVersion(url)
  }
  return oid
}

/**
 * Takes valueset from CQF server and transform
 * @param vs
 */
const transformForVSAC = (vs: fhir4.ValueSet) => {
  const clonedVs = cloneDeep(vs)
  const vsId = clonedVs?.url?.split('|')[0]
  clonedVs.url = `${vsId}-${clonedVs.version}`
  return clonedVs
}

// fullUrlBundle comes with the bundle resource when search is applied
const transformFromVSACToCqf = (vs: fhir4.ValueSet, fullUrlBundle?: string) => {
  const clonedVs = cloneDeep(vs)
  if (typeof fullUrlBundle === 'string') {
    clonedVs.url = fullUrlBundle
  }
  const splitPaths = clonedVs?.url?.split('/') || []
  // get last part of url
  const vsIdWithVersion = splitPaths?.pop() as string
  // extract without t
  const vsId = idWithoutVersion(vsIdWithVersion)
  splitPaths.push(vsId)
  clonedVs.url = splitPaths.join('/')
  return clonedVs
}

const getKeywords = (valueset: fhir4.ValueSet) => {
  const keywordExtensions = valueset?.extension?.filter((ext) => ext.url === EXTENSIONS.VALUESET_KEYWORD) || []
  return keywordExtensions
}

export {
  getOid,
  addExtensionToVs,
  addValueSetToGrouper,
  authoritativeSourceExtensionUrl,
  getProgramManifestVersions,
  getTerminologySource,
  removeValueSetFromGrouper,
  setExpansionParameters,
  getKeywords,
  valuesetDataForDisplay,
  updateLeafVsVersion,
  createGrouperWithMetadata,
  updateGrouperWithMetadata,
  idWithoutVersion,
  urlWithoutVersion,
  transformForVSAC,
  transformFromVSACToCqf
}
