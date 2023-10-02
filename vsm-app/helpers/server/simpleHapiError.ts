import logger from '@/helpers/server/logger'
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

const logSimpleHapiError = (e: HapiError | any, location?: string): void => {

  if (is.hapiError(e)) {
    const formattedError = formatHapiError(e, location)
    logger.error(formattedError)
  } else {
    logger.error(`Error not from HAPI: , ${e}`)
    logger.error(`Location: ${location}`)
  }
}

export { logSimpleHapiError, formatHapiError }
