import { is } from './is'
import { cloneDeep } from 'lodash'

/**
 * https://alphora.atlassian.net/browse/APHL-910
 * Remove ValueSet.meta.tags that have a value from the 'vsm-valueset-tag' code system
 * Remove profile conformance (meta.profiles) declarations:
 * CRMI Manifest Library on root Library
 * ‘vsm-grouper-valueset’ on grouping value sets
 * ‘vsm-condition-valueset’ on leaf value sets
 * ‘vsm-hosted-valueset’ on leaf value sets
 */

export const URLS_TO_REMOVE = new Set([
  'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library',
  'http://aphl.org/fhir/vsm/StructureDefinition/vsm-groupervalueset',
  'http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset',
  'http://aphl.org/fhir/vsm/StructureDefinition/vsm-hostedvalueset'
])
export default function sanitizeExport(exportBundle: fhir4.Bundle | string) {
  if (is.bundle(exportBundle)) {
    const bundle = cloneDeep(exportBundle)
    bundle.entry?.forEach((entry) => {
      if (entry?.resource?.meta?.profile) {
        entry.resource.meta.profile = entry?.resource?.meta?.profile?.filter((profile) => !URLS_TO_REMOVE.has(profile))
      }
    })
    return bundle
  } else if (typeof exportBundle === 'string') {
    const matchString = Array.from(URLS_TO_REMOVE).join('|')
    const regex = new RegExp(`<profile value="(${matchString})"\s*/>`, 'gi')
    return exportBundle.replaceAll(regex, '')
  } else {
    console.warn('Invalid export bundle')
    return exportBundle
  }
}
