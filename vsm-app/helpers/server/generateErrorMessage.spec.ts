import { generateErrorMessage } from './generateErrorMessage'
import { hapiErrorCodes } from './hapiErrorCodes'

describe('generateErrorMessage', () => {
  it('generates the proper message when it exists in hapiErrorCodes.ts', () => {
    expect(generateErrorMessage({ serverResponse: OPERATION_OUTCOME, defaultErrorMessage: 'oh no' }))
      .toBe('Only one draft of a program can exist at a time.')
  })

  it('Returns the default message if the code is unknown', () => {
    expect(generateErrorMessage({ serverResponse: FAILURE_OPERATION_OUTCOME, defaultErrorMessage: 'oh no' }))
      .toBe('oh no')
  })

  it('returns the default err message if the serverResponse does not have an issue block', () =>{
    expect(generateErrorMessage({ serverResponse: FAILURE_OPERATION_OUTCOME_2, defaultErrorMessage: 'ay caramba' }))
      .toBe('ay caramba')
  })
})

const OPERATION_OUTCOME = {
  resourceType: 'OperationOutcome',
  text: {
    status: 'generated',
    div: '<div>test 1</div>'
  },
  issue: [
    {
      severity: 'error',
      code: 'processing',
      diagnostics: "HAPI-0389: Failed to call access method: java.lang.IllegalStateException: A draft of Program 'http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary' already exists with ID: 'Library/39/_history/1'. Only one draft of a program can exist at a time."
    }
  ]
} as fhir4.OperationOutcome

const FAILURE_OPERATION_OUTCOME = {
  resourceType: 'OperationOutcome',
  text: {
    status: 'generated',
    div: '<div>test 1</div>'
  },
  issue: [
    {
      severity: 'error',
      code: 'processing',
      diagnostics: "HAPI-0000: Shouldn't get this."
    }
  ]
} as fhir4.OperationOutcome

const FAILURE_OPERATION_OUTCOME_2 = {
  resourceType: 'OperationOutcome',
  text: {
    status: 'generated',
    div: '<div>test 1</div>'
  }
} as fhir4.OperationOutcome