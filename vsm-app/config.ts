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
  defaultPublisher: {
    env: process.env.NEXT_PUBLIC_DEFAULT_PUBLISHER,
    default: 'CSTE Steward'
  },
  defaultAuthor: {
    env: process.env.NEXT_PUBLIC_DEFAULT_AUTHOR,
    default: 'CSTE Author'
  }
}

type ConfigName = 'defaultPublishingUrl' | 'defaultPublisher' | 'defaultAuthor'

const getConfigItem = (configTitle: ConfigName): string => {
  const envItem = itemsFromConfig?.[configTitle]?.env
  const defaultItem = itemsFromConfig?.[configTitle]?.default

  if (envItem) return envItem

  if (defaultItem) {
    console.error(`Missing ${configTitle} from .env, using default`)
    return defaultItem
  }

  console.error(`Missing .env and default value for ${configTitle}. Setting to empty string ''`)
  return ''
}

export default getConfigItem