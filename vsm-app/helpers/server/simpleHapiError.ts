import { HapiError } from '@/types/hapiError'

const logSimpleHapiError = (e: HapiError): void => {
  const { status } = e.response
  const { severity, code, diagnostics } = e.response.data.issue[0]

  const error = ({
    status,
    severity,
    code,
    diagnostics
  })
  console.error(error)
}

export { logSimpleHapiError }