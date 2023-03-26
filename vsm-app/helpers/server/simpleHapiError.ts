import { HapiError } from '@/types/hapiError'
import { is } from '@/helpers/is'

const logSimpleHapiError = (e: HapiError | any, location?: string): void => {
  console.log('e: ', JSON.stringify(e));

  if (is.hapiError(e)) {
    const { status } = e.response
    const { severity, code, diagnostics } = e.response.data.issue[0]

    const error = ({
      location,
      status,
      severity,
      code,
      diagnostics
    })
    console.error(error)
  } else {
    console.error('Error not from HAPI: ', e)
    console.error(`Location: ${location}`)
  }
}

export { logSimpleHapiError }

const testErr = {
  response: {
    status: 404,
    data: {
      resourceType: 'OperationOutcome',
      text: [Object],
      issue: [Array]
    }
  },
  config: {
    method: 'GET',
    url: 'http://localhost:8082/fhir/ValueSet/test-cat-123',
    headers: {}
  }
}



const test = is.hapiError(testErr)