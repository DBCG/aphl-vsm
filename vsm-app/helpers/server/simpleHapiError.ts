import logger from '@/helpers/server/logger'
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
    logger.error(error)
  } else {
    logger.error(e)
    logger.error(`Location: ${location}`)
  }
}

export { logSimpleHapiError }
