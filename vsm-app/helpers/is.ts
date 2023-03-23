import { ErrorResponse } from "pages/api/programs/[id]/grouper/valueset"

const is = {
  activityDefinition: (resource: fhir4.ActivityDefinition | any): resource is fhir4.ActivityDefinition => {
    return resource?.resourceType === 'ActivityDefinition'
  },
  bundle: (resource: fhir4.Bundle | any): resource is fhir4.Bundle => {
    return resource?.resourceType === 'Bundle'
  },
  bodyStructure: (resource: fhir4.BodyStructure | any): resource is fhir4.BodyStructure => {
    return resource?.resourceType === 'BodyStructure'
  },
  codeableConcept: (resource: fhir4.CodeableConcept | any): resource is fhir4.CodeableConcept => {
    const codeableConceptKeys = ['coding', 'text']
    const subsetOfSpec = Object.keys(resource).every((k) => codeableConceptKeys.includes(k))
    if (resource.coding) {
      return subsetOfSpec && is.coding(resource.coding)
    } else {
      return subsetOfSpec
    }
  },
  coding: (resource: fhir4.Coding | any): resource is fhir4.Coding => {
    const codingKeys = ['system', 'version', 'code', 'display', 'userSelected']
    return Object.keys(resource).every((k) => codingKeys.includes(k))
  },
  condition: (resource: fhir4.Condition | any): resource is fhir4.Condition => {
    return resource?.resourceType === 'Condition'
  },
  definedString: (item: any): item is string => {
    return !!item && typeof item === 'string'
  },
  deviceDefinition: (resource: fhir4.DeviceDefinition | any): resource is fhir4.DeviceDefinition => {
    return resource?.resourceType === 'DeviceDefinition'
  },
  episodeOfCare: (resource: fhir4.EpisodeOfCare | any): resource is fhir4.EpisodeOfCare => {
    return resource?.resourceType === 'EpisodeOfCare'
  },
  errorResponse: (resource: ErrorResponse | any): resource is ErrorResponse => {
    return typeof resource?.errorMessage === 'string' && typeof resource?.resStatus === 'number'
  },
  library: (resource: fhir4.Library | any): resource is fhir4.Library => {
    return resource?.resourceType === 'Library'
  },
  isRootLibrary: (resource: fhir4.Library | any): resource is fhir4.Library => {
    // All three constitutes a root library
    const type = resource.type.coding?.[0]?.code === 'asset-collection'
    const usageContext = resource.useContext.find((i: fhir4.UsageContext) => i?.code?.code === 'specification-type')
    const usageContextProgram = usageContext.valueCodeableConcept?.[0]?.code === 'program'

    return type && usageContextProgram && usageContext
  },
  observation: (resource: fhir4.Observation | any): resource is fhir4.Observation => {
    return resource?.resourceType === 'Observation'
  },
  operationOutcome: (resource: fhir4.OperationOutcome | any): resource is fhir4.OperationOutcome => {
    return resource?.resourceType === 'OperationOutcome'
  },
  organization: (resource: fhir4.Organization | any): resource is fhir4.Organization => {
    return resource?.resourceType === 'Organization'
  },
  patient: (resource: fhir4.Patient | any): resource is fhir4.Patient => {
    return resource?.resourceType === 'Patient'
  },
  practitioner: (resource: fhir4.Practitioner | any): resource is fhir4.Practitioner => {
    return resource?.resourceType === 'Practitioner'
  },
  questionnaire: (resource: fhir4.Questionnaire | any): resource is fhir4.Questionnaire => {
    return resource?.resourceType === 'Questionnaire'
  },
  searchBundle: (resource: fhir4.Bundle | any): resource is fhir4.Bundle => {
    return is.bundle(resource) && resource?.type === 'searchset'
  },
  serviceRequest: (resource: fhir4.ServiceRequest | any): resource is fhir4.ServiceRequest => {
    return resource?.resourceType === 'ServiceRequest'
  },
  string: (value: string | any): value is string => {
    return typeof value === 'string'
  },
  substance: (resource: fhir4.Substance | any): resource is fhir4.Substance => {
    return resource?.resourceType === 'Substance'
  },
  valueSet: (resource: fhir4.ValueSet | any): resource is fhir4.ValueSet => {
    return resource?.resourceType === 'ValueSet'
  },
  promiseFulfilled: <T>(PromiseSettledResult: PromiseSettledResult<T>): PromiseSettledResult is PromiseFulfilledResult<T> => PromiseSettledResult.status === 'fulfilled'
}

export { is }

const test = 'test' as fhir4.BundleEntrySearch
