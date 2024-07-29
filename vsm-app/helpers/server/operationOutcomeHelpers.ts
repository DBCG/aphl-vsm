import { XMLParser } from 'fast-xml-parser'
import { logSimpleError } from './simpleHapiError'
import { is } from '../is'

// the xml -> js obj parser returns the obj with some artifacts
// clear out @_value later
interface ParsedIssueItem {
  severity: { '@_value': string }
  code: { '@_value': string }
  diagnostics: { '@_value': string }
  location?: { '@_value': string[] }
}

interface IssueItem {
  severity: string
  code: string
  diagnostics?: string
  location?: string[]
}

const validationOptions = {
  ignoreAttributes: false
}

const simplifyIssueItem = (item: ParsedIssueItem): IssueItem => {

  const res = ({
    severity: item.severity['@_value'],
    code: item.code['@_value'],
    diagnostics: item.diagnostics['@_value'],
  }) as IssueItem

  if (item.location) {
    res.location = item.location['@_value']
  }

  return res
}

const simplifyHapiHttpError = (hapiErrBlock: HapiHttpErrorRes): IssueItem => {
  const res = {
    severity: hapiErrBlock.status > 399 ? 'error' : 'warning',
    code: `Status: ${hapiErrBlock.status}`,
    diagnostics: `Encountered error: "${hapiErrBlock.error}"`,
    location: [hapiErrBlock.path]
  }
  return res
}

const parser = new XMLParser(validationOptions)

const normalizeIssueFormat = (issueBlock: ParsedIssueItem | ParsedIssueItem[] | HapiHttpErrorRes): IssueItem[] => {
  if (Array.isArray(issueBlock)) {
    return issueBlock.map(item => simplifyIssueItem(item))
  } else if (is.hapiErrorHttpRes(issueBlock)) {
    const res = [simplifyHapiHttpError(issueBlock)]
    return res
  } else {
    return [simplifyIssueItem(issueBlock)]
  }
}

const conformsToIssueFormat = (parsedXmlOpOutcome: any) => {
  if (
    parsedXmlOpOutcome?.OperationOutcome?.issue?.severity ||
    parsedXmlOpOutcome?.OperationOutcome?.issue?.length
  ) return true
  return ({ error: 'OperationOutcome has unexpected format' })
}

export interface HapiHttpErrorRes {
  timestamp: number
  status: number
  error: string
  path: string
}

// currently returns only breaking errors
// when opOutcome is a string it's xml + needs to be parsed
export const formatErrors = (
  opOutcome: fhir4.OperationOutcome | string | HapiHttpErrorRes | fhir4.Bundle
): IssueItem[] => {
  if (typeof opOutcome === 'string') {
    if (opOutcome.startsWith('<OperationOutcome')) {
      const jsObj = parser.parse(opOutcome)
      if (conformsToIssueFormat(jsObj) === true) {
        return normalizeIssueFormat(jsObj.OperationOutcome.issue)
      } else {
        logSimpleError('Input not properly formatted')
      }
    } else {
      logSimpleError('Expected XML OperationOutcome, received unknown string')
    }
  } else if (is.hapiErrorHttpRes(opOutcome)) {
    const result = [simplifyHapiHttpError(opOutcome)]
    return result
  } else if (is.operationOutcome(opOutcome)) {
    return opOutcome.issue.filter(iss => iss?.severity === 'fatal' || iss?.severity === 'error') || []
  } else if (opOutcome.resourceType === 'Bundle') {
    return opOutcome.entry
      ?.filter(entry => entry?.resource?.resourceType === "OperationOutcome")
      ?.flatMap(entry => formatErrors(entry.resource as fhir4.OperationOutcome)) || []
  }
  return []
}