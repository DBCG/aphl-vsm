import { Options } from 'react-select'

export const authenticationTypes = {
  basic: 'Basic Authentication',
}

export const authenticationOptions: Options<{ value: string; label: string }> = Object.entries(
  authenticationTypes
).map(([key, value]) => ({ value: key, label: value })) as Options<{ value: keyof typeof authenticationTypes; label: string }>