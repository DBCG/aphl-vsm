/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'

let logger: Pino.Logger
logger = Pino.pino(pretty(
  {
    ignore: 'pid,hostname',
    messageFormat: (log) => {
      return "id: " + log.logId + " - " + log.msg
    }
  }
))
logger.level = process.env.LOG_LEVEL || 'info'

export default logger
