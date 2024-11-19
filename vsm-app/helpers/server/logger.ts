/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'
import { v4 as uuidv4 } from 'uuid';

const logId = uuidv4()

let logger: Pino.Logger
logger = Pino.pino(pretty(
  {
    ignore: 'pid,hostname,logId', // prevent logId from being duplicate in logs
    messageFormat: (log) => {
      return "id: " + log.logId + " - " + log.msg
    }
  }
))
logger.level = process.env.LOG_LEVEL || 'info'

const childLogger = logger.child({ logId })

export { logId }
export default childLogger
