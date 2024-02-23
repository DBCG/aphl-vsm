import { XMLParser } from 'fast-xml-parser'
import { logSimpleError } from './simpleHapiError'
import { is } from '../is'

// the xml -> js obj parser returns the obj with some artifacts
// clear out @_value later
interface ParsedIssueItem {
  severity: { '@_value': string }
  code: { '@_value': string }
  diagnostics: { '@_value': string }
}

interface IssueItem {
  severity: string
  code: string
  diagnostics: string
}

const validationOptions = {
  ignoreAttributes: false
}

const simplifyIssueItem = (item: ParsedIssueItem): IssueItem => ({
  severity: item.severity['@_value'],
  code: item.code['@_value'],
  diagnostics: item.diagnostics['@_value']
})

const parser = new XMLParser(validationOptions)

const normalizeIssueFormat = (issueBlock: ParsedIssueItem | ParsedIssueItem[]): IssueItem[] => {
  if (Array.isArray(issueBlock)) {
    return issueBlock.map(item => simplifyIssueItem(item))
  } else {
    const res = [simplifyIssueItem(issueBlock)]
    return res
  }
}

const conformsToIssueFormat = (parsedXmlOpOutcome: any) => {
  if (
    parsedXmlOpOutcome?.OperationOutcome?.issue?.severity ||
    parsedXmlOpOutcome?.OperationOutcome?.issue?.length
  ) return true
  return ({ error: 'OperationOutcome has unexpected format' })
}

// currently returns only breaking errors
// when opOutcome is a string it's xml + needs to be parsed
export const formatErrors = (
  opOutcome: fhir4.OperationOutcome | 'string' | any
): IssueItem[] | fhir4.OperationOutcomeIssue[] => {
  if (typeof opOutcome === 'string') {
    if (opOutcome.startsWith('<OperationOutcome')) {
      const jsObj = parser.parse(opOutcome)
      if (conformsToIssueFormat(jsObj) === true) {
        return normalizeIssueFormat(jsObj.OperationOutcome.issue)
      } else {
        logSimpleError('Input not properly formatted') 
      }
    } else {
      logSimpleError('Input not an OperationOutcome')
    }
  } else if (is.operationOutcome(opOutcome)) {
    return opOutcome.issue.filter(iss => iss?.severity === 'fatal' || iss?.severity === 'error') || []
  }
  return []
}