import FhirClient from "@/backend/clients/FhirClient"
import { is } from "../is"
import { getGrouperLibraryCanonical } from "../libraryHelpers"
import { fetchGrouperLibrary, fetchGrouperValueSets } from "./serverValueSetHelper"

const isDefinedString = (item: any): item is string => {
  return !!item
}

export const getProgram = async (programId: string): Promise<fhir4.Library> => {
  const program = await FhirClient.getInstance().read({ resourceType: 'Library', id: programId })
  // disabling proto-cache because it causes problems with updating groupers
  if (!is.library(program)) {
    throw new Error(`Program ${programId} must be a FHIR Library`)
  }
  return program
}

export const getGrouperLibrary = async (program: fhir4.Library): Promise<fhir4.Library> => {
  // get the grouper canonical, which is a Library resource
  // the program only has 2 relatedArtifacts: a Library and a PlanDefinition
  const grouperLibraryCanonical = getGrouperLibraryCanonical(program)
  if (!grouperLibraryCanonical) {
    throw new Error(`Could not find Grouper Library canonical for Program ${program.id}`)
  }
  const grouperStatus = program.status // active programs get active groupers, draft get draft groupers
  // there is still going to be a bug here until we fix the fact that groupers are unversioned after draft

  const grouperSearchResult = await fetchGrouperLibrary({ client: FhirClient.getInstance(), canonical: grouperLibraryCanonical, grouperStatus })

  const result = grouperSearchResult?.entry?.[0]?.resource
  if (is.library(result)) {
    return result
  }
  throw new Error(`Could not get Grouper Library for Program ${program.id}`)
}

// All leaf valuesets are required to belong to at least one grouper
// so if none exist, this is a problem
export const getGrouperValuesets = async (grouperLib: fhir4.Library): Promise<fhir4.ValueSet[]> => {
  const grouperValueSetCanonicals = grouperLib.relatedArtifact
    ?.filter((a) => a.type == 'composed-of')
    .map((res) => res.resource)
    .filter(isDefinedString)

  if (!grouperValueSetCanonicals) throw new Error(`No Grouper Valuesets linked to Library ${grouperLib.id}`)

  const allGrouperVSets = (
    (await fetchGrouperValueSets({ canonicals: grouperValueSetCanonicals }))
      .filter(is.bundle)
      .flatMap((bundle) => bundle?.entry?.map((e) => e?.resource!))
      .filter((x) => !!x) as fhir4.Resource[]
  ).filter(is.valueSet)

  if (!allGrouperVSets) throw new Error(`No Grouper Valuesets found for Library ${grouperLib.id}`)
  return allGrouperVSets
}
