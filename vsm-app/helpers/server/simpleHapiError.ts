import { getLogger } from '@/helpers/server/logger'
import { FormattedHapiError, HapiError } from '@/types/hapiError'
import { is } from '@/helpers/is'

const formatHapiError = (e: HapiError, location?: string): FormattedHapiError => {
  const status = e?.response?.status
  const severity = e?.response?.data?.issue?.[0]?.severity
  const code = e?.response?.data?.issue?.[0]?.code
  const diagnostics = e?.response?.data?.issue?.[0]?.diagnostics

  const error = ({
    location,
    status,
    severity,
    code,
    diagnostics
  })

  return error
}

const logSimpleError = (e: HapiError | any, location?: string): void => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (is.hapiError(e)) {
    const formattedError = formatHapiError(e, location)
    if (isDevelopment) {
      console.error(formattedError)
    } else {
      getLogger().error(formattedError)
    }
  } else {
    if (isDevelopment) {
      console.error(e)
    } else {
      getLogger().error(`Error not from HAPI: , ${e}`)
      getLogger().error(`Location: ${location}`)
    }
  }
}

export { logSimpleError, formatHapiError }
