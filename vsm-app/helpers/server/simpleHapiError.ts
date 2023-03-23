import { HapiError } from '@/types/hapiError'
import { is } from '@/helpers/is'

const logSimpleHapiError = (e: HapiError | any): void => {
  if (is.hapiError(e)) {
    const { status } = e.response
    const { severity, code, diagnostics } = e.response.data.issue[0]

    const error = ({
      status,
      severity,
      code,
      diagnostics
    })
    console.error(error)
  } else {
    console.error('Error not from HAPI')
    console.error(e)
  }
}

export { logSimpleHapiError }