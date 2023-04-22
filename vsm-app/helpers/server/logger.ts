/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'
import fs from 'fs'

let logger: Pino.Logger
const logPath = process.env.LOG_PATH || '/var/log/containers/middleware.log'
if (process.env.ENABLE_LOGGING?.toLowerCase() === 'true') {
  // Check if directory is present, if not create it
  const logDir = logPath.substring(0, logPath.lastIndexOf('/'))
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  const streams = [{ stream: process.stdout }, { stream: fs.createWriteStream(logPath, { flags: 'a' }) }]
  logger = Pino.pino({}, Pino.multistream(streams))
  logger.level = process.env.LOG_LEVEL || 'debug'
} else {
  logger = Pino.pino(pretty())
}

export default logger
