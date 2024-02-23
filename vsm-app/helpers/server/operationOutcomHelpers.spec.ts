import { formatErrors } from './operationOutcomeHelpers'

const testXmlOpOutcome = (
  '<OperationOutcome xmlns="http://hl7.org/fhir">' +
  '<issue>' +
  '<severity value="error"/>' +
  '<code value="processing"/>' +
  '<diagnostics value="some diagnostics info here"/>' +
  '</issue>'
)

const sampleHapiError = {
  timestamp: 398479302,
  status: 204,
  error: 'failed to do the thing',
  path: 'around/here/somewhere'
}

const objOpOutcome = {
  resourceType: 'OperationOutcome',
  issue: [
    {
      severity: 'error',
      code: 'test error code',
      diagnostics: 'test error diagnostics'
    },
    {
      severity: 'fatal',
      code: 'test fatal code',
      diagnostics: 'test fatal diagnostics'
    },
    {
      severity: 'warning',
      code: 'test warning code',
      diagnostics: 'test warning diagnostics'
    }
  ]
}

describe('formatErrors()', () => {
  it('gets issues if XML OperationOutcome string', () => {
    const result = formatErrors(testXmlOpOutcome)

    expect(result).toStrictEqual([{
      code: "processing",
      diagnostics: "some diagnostics info here",
      severity: "error"
    }])
  })

  it('gets issues if opOutcome object and only return error or fatal severity', () => {
    const objRes = formatErrors(objOpOutcome)
    expect(objRes).toStrictEqual([
      {
        severity: 'error',
        code: 'test error code',
        diagnostics: 'test error diagnostics'
      },
      {
        severity: 'fatal',
        code: 'test fatal code',
        diagnostics: 'test fatal diagnostics'
      }
    ])
  })

  it('Converts HAPI http errors to a comparable format for display', () => {
    const hapiErrRes = formatErrors(sampleHapiError)
    expect(hapiErrRes).toStrictEqual([
      {
        severity: 'warning',
        code: 'Status: 204',
        diagnostics: 'Encountered error: "failed to do the thing"',
        location: [ 'around/here/somewhere' ]
      }
    ])
  })

  it('returns [] (aka no errors) if entry is unknown format', () => {
    const err1 = formatErrors(undefined)
    const err2 = formatErrors({})
    const err3 = formatErrors({ error: 'yikes' })
    const err4 = formatErrors('<Bundle></Bundle>')
    const err5 = formatErrors([])

    expect(err1).toStrictEqual([])
    expect(err2).toStrictEqual([])
    expect(err3).toStrictEqual([])
    expect(err4).toStrictEqual([])
    expect(err5).toStrictEqual([])
  })
})