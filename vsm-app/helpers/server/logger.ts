/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'
import fs from 'fs'

let logger: Pino.Logger
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
if (process.env.LOG_PATH) {
  // Deployed environment should be something like this '/var/log/containers'
  // Check if directory is present, if not create it
  const logPath = process.env.LOG_PATH
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true })
  }
  const streams = [{ stream: process.stdout }, { stream: fs.createWriteStream(logPath + '/output.log', { flags: 'a' }) }]
  logger = Pino.pino({}, Pino.multistream(streams))
  logger.level = LOG_LEVEL
} else {
  logger = Pino.pino(pretty())
  logger.level = LOG_LEVEL
}

export default logger
