import logger from './helpers/server/logger'

interface ItemDetails {
  env: string | undefined
  default: string
}

interface ConfigItems {
  [key: string]: ItemDetails
}

const itemsFromConfig: ConfigItems = {
  publishingUrl: {
    env: process.env.NEXT_PUBLIC_DEFAULT_PUBLISHING_URL,
    default: 'http://ersd.aimsplatform.org/fhir'
  },
  nextAuthUrl: {
    env: process.env.NEXTAUTH_URL,
    default: 'http://localhost:3000'
  },
  fhirCdrUrl: {
    env: process.env.NEXTAUTH_URL,
    default: 'http://localhost:8082/fhir'
  },
  defaultPublisher: {
    env: process.env.NEXT_PUBLIC_DEFAULT_PUBLISHER,
    default: 'CSTE Steward'
  },
  defaultAuthor: {
    env: process.env.NEXT_PUBLIC_DEFAULT_AUTHOR,
    default: 'CSTE Author'
  },
  enableCache: {
    env: process.env.ENABLE_CACHE,
    default: 'false'
  },
  logPath: {
    env: process.env.LOG_PATH,
    default: ''
  },
  redisHost: {
    env: process.env.REDIS_HOST,
    default: '127.0.0.1'
  },
  redisPassword: {
    env: process.env.REDIS_PASSWORD,
    default: ''
  },
  conditionsCanonical: {
    env: process.env.CONDITIONS_CANONICAL,
    default: 'http://ersd.aimsplatform.org/fhir/ValueSet/rckms-condition-codes'
  }
}

type ConfigName = 'defaultPublishingUrl' | 'nextAuthUrl' | 'fhirCdrUrl' | 'defaultPublisher' | 'defaultAuthor' | 'enableCache' | 'logPath' | 'redisHost' | 'redisPassword' | 'conditionsCanonical'

const getConfigItem = (configTitle: ConfigName): string => {
  const envItem = itemsFromConfig?.[configTitle]?.env
  const defaultItem = itemsFromConfig?.[configTitle]?.default

  if (envItem) return envItem

  if (defaultItem) {
    logger.error(`Missing ${configTitle} from .env, using default`)
    return defaultItem
  }

  logger.error(`Missing .env and default value for ${configTitle}. Setting to empty string ''`)
  return ''
}

export default getConfigItem