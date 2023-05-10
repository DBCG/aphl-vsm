import logger from '@/helpers/server/logger'
import { HapiError } from '@/types/hapiError'
import { is } from '@/helpers/is'

const logSimpleHapiError = (e: HapiError | any, location?: string): void => {
  console.log('e: ', JSON.stringify(e));

  if (is.hapiError(e)) {
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
    logger.error(error)
  } else {
    logger.error(`Error not from HAPI: , ${e}`)
    logger.error(`Location: ${location}`)
  }
}

export { logSimpleHapiError }
