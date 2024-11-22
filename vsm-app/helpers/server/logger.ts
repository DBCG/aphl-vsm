/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'
import { v4 as uuidv4 } from 'uuid'

class Logger {
  private static instance: Pino.Logger
  private static logId: string

  static initLogger() {
    if (!Logger.instance) {
      Logger.instance = Pino.pino(
        pretty({
          ignore: 'pid,hostname,logId', // prevent logId from being duplicate in logs
          messageFormat: (log) => {
            return 'id: ' + log.logId + ' - ' + log.msg
          }
        })
      )
      Logger.instance.level = process.env.LOG_LEVEL || 'info'  
    }
    Logger.logId = uuidv4()
    Logger.instance = Logger.instance.child({ logId: Logger.logId })
  }

  static getLogger() {
    return Logger.instance
  }

  static getLogId() {
    return Logger.logId
  }
}

export default Logger

