/* eslint-disable no-console */
import * as Pino from 'pino'
import pretty from 'pino-pretty'

let logger: Pino.Logger
logger = Pino.pino(pretty())
logger.level = process.env.LOG_LEVEL || 'info'

export default logger
