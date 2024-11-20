/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'
import { v4 as uuidv4 } from 'uuid';

// let logId: string

// let logger: Pino.Logger
// logger = Pino.pino(pretty(
//   {
//     ignore: 'pid,hostname,logId', // prevent logId from being duplicate in logs
//     messageFormat: (log) => {
//       return "id: " + log.logId + " - " + log.msg
//     }
//   }
// ))
// getLogger().level = process.env.LOG_LEVEL || 'info'

// const childLogger = () => {
//   logId = uuidv4()
//   console.log('logId', logId)
//   logger = getLogger().child({ logId })
// }

// export { logId, logger }

class Logger {  
  static logId: string
  static log: Pino.Logger

  static initLogger() {
    Logger.log = Pino.pino(pretty(
      {
        ignore: 'pid,hostname,logId', // prevent logId from being duplicate in logs
        messageFormat: (log) => {
          return "id: " + log.logId + " - " + log.msg
        }
      }
    ))
    Logger.log.level = process.env.LOG_LEVEL || 'info'
    Logger.logId = uuidv4()
    Logger.log = Logger.log.child({ logId: Logger.logId })
  }

  static getLogger() {
    Logger.initLogger()
    return Logger.log
  }

  static getLogId() {
    return Logger.logId
  }
}
const getLogger = Logger.getLogger
const getLogId = Logger.getLogId

export {
  getLogger,
  getLogId
}
