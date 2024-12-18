import { cloneDeep, set } from 'lodash'
import { grouperValueSetBase } from './server/templates/grouperValueSetBase'
import { GrouperMetadata } from '@/types/grouperTypes'
import { TerminologyResult } from '@/types/valuesets'
import { ManifestDataMap, SelectedManifestDataVersion } from '@/types/manifestTypes'
import { get, uniq } from 'lodash'
import { VSM_META_PROFILE_URLS } from '@/constants'
import { DeleteData, UpdateData } from '@/pages/api/codesystem/provisional'

const EXTENSIONS = {
  VALUESET_KEYWORD: 'http://hl7.org/fhir/StructureDefinition/valueset-keyWord',
  AUTH_SOURCE_EXTENSION_URL: 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource',
  EXPANSION_PARAM_URL: 'http://hl7.org/fhir/StructureDefinition/cqf-expansionParameters',
  PROVISIONAL_CS_BASE: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-codesystem-base'
} as const

const VSM_LEAF_PROFILE_URLS = {
  CONDITION: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset',
  HOSTED: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-hostedvalueset'
}

const vsmAuthoritativeSourceExtension: fhir4.Extension =
{
  url: EXTENSIONS.AUTH_SOURCE_EXTENSION_URL,
  valueUri: process.env.EXTERNAL_FHIR_CDR_URL
}

const isProvisionalVs = (vs: fhir4.ValueSet) => {
  return Boolean(vs?.compose?.include?.find(ci => ci?.version === 'PROVISIONAL'))
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

const urlWithoutPinnedVersion = (url: string): string => {
  return url.split('|')[0]
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, vsCanonicals: string[]): fhir4.ValueSet | null => {
  const vsCanonicalsWithoutPinned = vsCanonicals?.map(c => urlWithoutPinnedVersion(c))
  const updatedComposeInclude = vs?.compose?.include
    ?.map((item) => {
      const match = vsCanonicalsWithoutPinned.includes(urlWithoutPinnedVersion(item.valueSet![0]))
      if (match) {
        return
      } else {
        return item
      }
    })
    .filter((x) => !!x) as fhir4.ValueSetComposeInclude[]
  if (updatedComposeInclude && vs?.compose?.include) {
    vs.compose.include = updatedComposeInclude
    return vs
  } else {
    console.error('grouper does not have compose include')
    return null
  }
}

// this only handles extensions with valueUri as type for now
const addExtensionToVs = (vs: fhir4.ValueSet, extensionUri: string, extensionValue: string): fhir4.ValueSet => {
  const valueToAdd = {
    url: extensionUri,
    valueUri: extensionValue
  }

  if (vs?.extension) {
    // if this extension already exists
    const matchIndex = vs.extension.findIndex(i => i.url === extensionUri)
    if (matchIndex > -1) {
      vs.extension[matchIndex] = valueToAdd
    } else {
      vs.extension.push(valueToAdd)
    }
  } else {
    vs.extension = [valueToAdd]
  }
  return vs
}

const isVsmAuthored = (vs: fhir4.ValueSet) => vs?.meta?.tag?.find((tag) => tag?.code === 'vsm-authored')

const isVsmGrouper = (vs: fhir4.ValueSet) => vs?.meta?.profile?.includes(VSM_META_PROFILE_URLS.VSM_GROUPERVALUESET_URL)
export const isTerminologyServerGrouper = (vs: fhir4.ValueSet) => {
  return vs?.compose?.include?.find((include) => include.valueSet)
}

const isGrouperValueSet = (vs: fhir4.ValueSet) => isVsmGrouper(vs) || isTerminologyServerGrouper(vs)

interface AvailableTermServer {
  label: string
  value: {
    id: string
    url: string
  }
}

const getTerminologySource = (valueSet: fhir4.ValueSet, availableTerminologyServers: AvailableTermServer[], errors: string[]): TerminologyResult => {
  const authoritativeSourceExtension = valueSet?.extension?.find((ext) => ext.url === EXTENSIONS.AUTH_SOURCE_EXTENSION_URL)
  // if the authoritative source exists, match the terminology server to the beginning of the auth source string
  if (authoritativeSourceExtension) {

    let val = availableTerminologyServers?.find((endpoint) => {
      let urlPath = endpoint?.value?.url
      if (urlPath.toLowerCase().startsWith('https://cts.nlm.nih.gov/fhir')) {
        // workaround for auth src and term server definition mismatch
        urlPath = urlPath.replace('https://', 'http://')
      }
      return typeof urlPath === 'string' && authoritativeSourceExtension?.valueUri?.startsWith(urlPath)
    })

    if (!val) {
      // To get VSM to show up as an option because we don't want to add to terminology server list
      if (isVsmAuthored(valueSet)) {
        val = {
          label: 'VSM',
          value: {
            id: 'VSM',
            url: authoritativeSourceExtension?.valueUri as string
          }
        }
      } else {
        errors.push(`Value Set ${valueSet.id} has no matching Authoritative Source`)
      }
    }
    return {
      value: val?.label || "",
      hasExtension: true
    }
  // otherwise, if auth source does not exist
  } else {
    errors.push(`Value Set ${valueSet.id} has no Authoritative Source`)
    // if no other choice, INFER the terminology server
    // check if valueset url shares a base url with one of the terminology servers
    // if so, use that as the return
    const valuesetServerBase = valueSet?.url?.split('/fhir/')?.[0]?.split('//')[1]

    if (valuesetServerBase) {
      const terminologyItem = availableTerminologyServers?.find((endpoint) => endpoint?.value?.url?.includes(valuesetServerBase))
      return {
        value: terminologyItem?.label || "",
        hasExtension: false
      }
    } else {
      return {
        value: "",
        hasExtension: false
      }
    }
  }
}

// can't pass through whole valuesets -- node will error if data too large
// this fn pares down to a set of keys needed for display
const valuesetDataForDisplay = (valueset: fhir4.ValueSet) => {
  const allowedProperties = ['id', 'url', 'resourceType', 'version', 'date', 'name', 'publisher', 'description', 'meta', 'useContext', 'extension']

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

const buildParametersParameter = (manifestDataMap: ManifestDataMap) => {
  const parameters = [] as fhir4.ParametersParameter[]
  for (const [key, value] of Object.entries(manifestDataMap)) {
    value.forEach((v) => {
      parameters.push({
        name: 'system-version',
        valueString: `${key}|${v}`
      })
    })
  }
  return parameters
}

const setExpansionParameters = (library: fhir4.Library, manifestDataMap: ManifestDataMap) => {
  const extension = library?.extension?.find((ext) => ext.url === EXTENSIONS.EXPANSION_PARAM_URL)
  if (extension == null) {
    library.extension = [
      ...(library?.extension || []),
      {
        url: 'http://hl7.org/fhir/StructureDefinition/cqf-expansionParameters',
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
  const parameterMap: SelectedManifestDataVersion = {}
  const parameterResource = library?.contained?.find((resource) => resource.id === 'expansion-parameters-ecr') as fhir4.Parameters
  const systemVersion = parameterResource?.parameter?.filter((i) => i.name === 'system-version')
  systemVersion?.forEach((i) => {
    const parameterSysVer = i.valueString || i.valueUri || ''
    const [system, version] = decodeURI(parameterSysVer).split('|') || []
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
  const templateVS: fhir4.ValueSet = cloneDeep(baseGrouper)

  const { author, ...rest } = metadata

  // apply all fields that are flat
  const vs: fhir4.ValueSet = Object.assign({}, templateVS, rest, { url: `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/ValueSet/${metadata.name?.replace(' ', '')}` })

  // apply extension
  vs.extension = [
    {
      url: `${process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL}/StructureDefinition/valueset-author`,
      valueContactDetail: {
        name: author
      }
    }, vsmAuthoritativeSourceExtension
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
    if (!newVs.id) {
      throw "ValueSet: '" + newVs.url + "' is missing ID"
    }
    updateAuthSource(newVs.extension, newVs.id)
  }

  // add all fields that are simple obj.assign
  // if ...rest doesn't contain anything, it defaults to {}
  return Object.assign(newVs, rest)
}
function updateAuthSource(extensions: fhir4.Extension[], id: string) {
  const existingAuthoritativeSourceExt = extensions.findIndex((ext) => ext?.url === EXTENSIONS.AUTH_SOURCE_EXTENSION_URL)
  const extensionToAdd = { ...vsmAuthoritativeSourceExtension, valueUri: vsmAuthoritativeSourceExtension.valueUri?.split('/ValueSet/')[0] + `/ValueSet/${id}` }
  if (existingAuthoritativeSourceExt === -1) {
    extensions.push(extensionToAdd)
  } else {
    extensions[existingAuthoritativeSourceExt] = extensionToAdd
  }
  return extensions
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

const getOid = (vs: fhir4.ValueSet| fhir4.Library) => {
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

const getVsSteward = (vs: fhir4.ValueSet) => vs?.extension?.find(xt => xt?.url?.endsWith('/valueset-steward'))?.valueContactDetail?.name || ''
const getVsAuthor = (vs: fhir4.ValueSet) => vs?.extension?.find(xt => xt?.url?.endsWith('/valueset-author'))?.valueContactDetail?.name || ''

const isVSMOwnedVSet = (vs: fhir4.ValueSet) => Boolean(vs?.meta?.tag?.find(t => t.code === 'vsm-authored'))

// Helper function to add valueset and return a unqiue list
const addProfileToValueSet = (valueset: fhir4.ValueSet) => {
  let profiles = get(valueset, 'meta.profile', []) as string[];
  profiles.push(
    VSM_LEAF_PROFILE_URLS.CONDITION,
    VSM_LEAF_PROFILE_URLS.HOSTED
  );
  profiles = uniq(profiles);
  set(valueset, 'meta.profile', profiles);
  return valueset;
}


interface UpdateVsItems {
  vs: fhir4.ValueSet
  action: 'replace-code'
  updateData: UpdateData
  csUrl: string
}

interface DeleteVsItems {
  vs: fhir4.ValueSet
  action: 'delete-code'
  updateData: DeleteData
  csUrl: string
}

const updateVsCodeItem = ({ vs, action, updateData, csUrl }: UpdateVsItems | DeleteVsItems) => {
  try {
    const clonedVs = cloneDeep(vs)
    let composeBlock: fhir4.ValueSetCompose = clonedVs.compose!

    if (action === 'replace-code') {
      updateData.codeUpdates.forEach(updateItem => {
        const indexOfSystem = composeBlock?.include?.findIndex((i) => i.system === csUrl)
        const indexOfUpdateItem = indexOfSystem !== undefined && indexOfSystem > -1 ? composeBlock?.include?.[indexOfSystem]?.concept?.findIndex((i) => i.code === updateItem.old.code) : undefined
        if (indexOfUpdateItem !== undefined && indexOfUpdateItem > -1) {
          const itemForVsComposeConcept = {
            code: updateItem.new.code,
            display: updateItem.new.display
          }
          if (composeBlock?.include?.[indexOfSystem]?.concept?.[indexOfUpdateItem]) {
            // @ts-ignore
            composeBlock.include[indexOfSystem].concept[indexOfUpdateItem] = itemForVsComposeConcept
          }
        } else {
          const errorText = `Failed to replace code in system with url ${csUrl} in Value Set with url ${vs.url} (${vs.title || vs.name})`
          throw new Error(errorText)
        }
      })
    } else if (action === 'delete-code') {
      updateData.codeUpdates.forEach(updateItem => {
        const indexOfSystem = composeBlock?.include?.findIndex((i) => i.system === csUrl)
        const lengthOfConcept = composeBlock?.include?.[indexOfSystem]?.concept?.length
        const indexOfUpdateItem = indexOfSystem !== undefined && indexOfSystem > -1
          ? composeBlock?.include?.[indexOfSystem]?.concept?.findIndex((i) => i.code === updateItem.code)
          : undefined

        if (indexOfUpdateItem !== undefined && indexOfUpdateItem > -1) {
          if (lengthOfConcept === 1) {
            // delete system block if this was the last code in it
            delete composeBlock.include[indexOfSystem]
          } else {
            composeBlock.include[indexOfSystem].concept = composeBlock.include[indexOfSystem].concept!.filter((i) => i.code !== updateItem.code)
          }
          // don't error out if no match was found, just log. Since they're trying to delete, fine if it doesn't exist already
        } else {
          console.error(`No match found to delete code ${updateItem.code} in system ${csUrl} in Value Set with url ${vs.url} (${vs.title || vs.name})`)
        }
      })
    }
    clonedVs.compose = composeBlock
    return clonedVs
  } catch (e: any) {
    const message = e?.message || `Error encountered while replacing code in Value Set with url ${vs.url}`
    return ({ error: message })
  }
}

// could be codes, valuesets, or filters
// this valueset definition...
// 1. includes codes from these systems (intensional)
// 2. includes codes from these valuesets
// 3. includes the overlapping codes from these valuesets
// 4. includes codes defined by these filters
// ... then all the same for excludes
// cannot have both concept and filter
interface vsDefinitionData {
  "include"?: {
    valuesetUnion?: Record<any, any>[]
    valuesetIntersection?: Record<any, any>[]
    filterItems?: Record<any, any>[]
    codes?: Record<any, any>[]

  }
  "exclude"?: {
    valuesetUnion?: Record<any, any>[]
    valuesetIntersection?: Record<any, any>[]
    filterItems?: Record<any, any>[]
    codes?: Record<any, any>[]
  }
}

const organizeValueSetDefinitionData = (vs: fhir4.ValueSet) => {
  const compiledDefinitionData: vsDefinitionData = {}
  // avoid duplication by interpolating include and exclude
  const possibilities: Array<'include' | 'exclude'> = ['include', 'exclude']

  possibilities.forEach((includeOrExclude: 'include' | 'exclude') => {
    vs?.compose?.[includeOrExclude]?.forEach((item) => {
      // add object if it doesn't exist
      if (!compiledDefinitionData?.[includeOrExclude]) {
        compiledDefinitionData[includeOrExclude] = {}
      }
      // if there's a system, it's either a set of codes or a filter
      if (item?.system) {
        // if there's a concept block, it includes codes
        if (item?.concept) {
          // create array if doesn't already exist
          if(!compiledDefinitionData[includeOrExclude]?.codes) {
            // @ts-ignore-next-line
            compiledDefinitionData[includeOrExclude].codes = []
          }
          // add each included code to the array with system and version info
          item.concept.forEach((concept) => {
            compiledDefinitionData[includeOrExclude]!.codes!.push({
              system: item.system,
              version: item.version,
              code: concept.code,
              display: concept.display
            })
          })
        // otherwise it's a filter
        } else if (item.filter) {
          // create array if doesn't already exist
          if(!compiledDefinitionData?.[includeOrExclude]?.filterItems) {
            // @ts-ignore-next-line
            compiledDefinitionData[includeOrExclude].filterItems = []
          }
          // add filter to the array
          // @ts-ignore-next-line
          compiledDefinitionData[includeOrExclude].filterItems.push({
            system: item.system,
            version: item.version,
            filter: item.filter
          })
        }
        // 
      }
      // if there's no system noted, it might be a valueset
      const vsLength = item?.valueSet?.length || 0
      // if there's only one item, it's a union situation
      if (vsLength == 1) {
        // create array if doesn't already exist
        if(!compiledDefinitionData?.[includeOrExclude]?.valuesetUnion) {
          // @ts-ignore-next-line
          compiledDefinitionData[includeOrExclude].valuesetUnion = []
        }
        // add to the array
        // @ts-ignore-next-line
        compiledDefinitionData[includeOrExclude].valuesetUnion.push({
          url: item.valueSet![0]
        })
      } else if (vsLength > 1) {
        // create array if doesn't already exist
        if(!compiledDefinitionData?.[includeOrExclude]?.valuesetIntersection) {
          // @ts-ignore-next-line
          compiledDefinitionData[includeOrExclude].valuesetIntersection = []
        }
        // add to the array
        // @ts-ignore-next-line
        compiledDefinitionData[includeOrExclude].valuesetIntersection.push({
          urls: item.valueSet
        })
      }
    })
  })
  return compiledDefinitionData
}

export {
  organizeValueSetDefinitionData,
  getVsSteward,
  isVSMOwnedVSet,
  getVsAuthor,
  getOid,
  addExtensionToVs,
  addValueSetToGrouper,
  EXTENSIONS,
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
  transformFromVSACToCqf,
  isProvisionalVs,
  isGrouperValueSet,
  isVsmAuthored,
  addProfileToValueSet,
  updateVsCodeItem,
  updateAuthSource,
  urlWithoutPinnedVersion
}
