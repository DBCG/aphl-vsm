import { Options } from 'react-select'
import { AUTH_TYPE } from '@/constants'

export const authenticationTypes = {
  [AUTH_TYPE.NONE]: 'No Authentication',
  [AUTH_TYPE.BASIC]: 'Basic Authentication',
}

export const authenticationOptions: Options<{ value: string; label: string }> = Object.entries(
  authenticationTypes
).map(([key, value]) => ({ value: key, label: value })) as Options<{ value: keyof typeof authenticationTypes; label: string }>