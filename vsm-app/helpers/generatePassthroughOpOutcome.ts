const { cloneDeep } = require('lodash')

const templateOpOutcome = {
  resourceType: 'OperationOutcome',
  issue: [
    {
      severity: 'error',
      code: 'processing',
      diagnostics: 'VSM FHIR API: ',
    }
  ]
}

const generatePassthroughOpOutcome = (message: string, isSuccess?: boolean) => {
  const opOutcome = cloneDeep(templateOpOutcome)
  opOutcome.issue[0].diagnostics = opOutcome.issue[0].diagnostics += message

  if (isSuccess) {
    opOutcome.issue[0].severity = 'information'
    opOutcome.issue[0].code = 'informational'
  }

  return opOutcome
}

export default generatePassthroughOpOutcome