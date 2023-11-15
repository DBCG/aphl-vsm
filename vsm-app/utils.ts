import cloneDeep from 'lodash.clonedeep'
import { is } from "./helpers/is"

// Usage: await sleep(1000);
export const sleep = (millis: number) => {
  return new Promise((resolve) => setTimeout(resolve, millis))
}
export const shallowEqual = (object1: any, object2: any) => {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)
  if (keys1.length !== keys2.length) {
    return false
  }
  for (let key of keys1) {
    if (object1[key] !== object2[key]) {
      return false
    }
  }
  return true
}

// @ts-ignore
export const fetcher = (...args) => fetch(...args).then((res) => res.json())

interface IncrementParams {
  valueToIncrement: any
  incrementType: 'major' | 'minor' | 'patch' | 'revision'
  fallbackValue: string
}

const incrementStringValue = (str: string) => {
  const parsed = parseInt(str)
  if (!Number.isNaN(parsed)) {
    return (parsed + 1).toString()
  }
}

export const incrementSemver = ({
  valueToIncrement,
  incrementType,
  fallbackValue
}: IncrementParams) => {
  // if not a string to begin with, return fallback default
  if (typeof valueToIncrement !== 'string') return fallbackValue

  // this will return whole string if '-draft' is not there
  const semverWithoutTag = valueToIncrement.split('-')[0]

  // if value is not semver format, return fallback
  if (!is.semver(semverWithoutTag)) return fallbackValue

  let [major, minor, patch, revision] = semverWithoutTag.split('.')

  switch (incrementType) {
    case 'major':
      major = incrementStringValue(major) || major
      break
    case 'minor':
      minor = incrementStringValue(minor) || minor
      break
    case 'patch':
      patch = incrementStringValue(patch) || patch
      break
    case 'revision':
      revision = incrementStringValue(revision) || revision || '0'
      break
  }
  // only append revision if it exists
  return `${major}.${minor}.${patch}${revision ? "." + revision : ""}`
}

export const removeDraftFromVersionString = (version: string) => version.replace('-draft', '')

export const updateResourceVersion = (
  resource: fhir4.Library | fhir4.ValueSet | fhir4.PlanDefinition,
  newVersion: string
) => {
  const clonedResource = cloneDeep(resource)
  clonedResource.version = newVersion
  return clonedResource
}
