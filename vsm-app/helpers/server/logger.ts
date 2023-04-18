/* eslint-disable no-console */
import * as Pino from 'pino'
import fs from 'fs'

let logger: Pino.Logger
const logPath = process.env.LOG_PATH || '/var/log/containers/middlware.log'
if (process.env.ENABLE_LOGGING?.toLowerCase() === 'true') {
  const streams = [{ stream: process.stdout }, { stream: fs.createWriteStream(logPath, { flags: 'a' }) }]
  logger = Pino.pino({}, Pino.multistream(streams))
  logger.level = process.env.LOG_LEVEL || 'debug'
} else {
  logger = {
    info: console.log,
    error: console.error,
    debug: console.log,
    warn: console.warn
  } as Pino.Logger
}

export default logger
