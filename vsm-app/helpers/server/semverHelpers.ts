import semver from 'semver'
import sort from 'semver/functions/sort'

const removeFlags = (item: any) => item?.split('-')?.[0]

const simpleSemverRx = new RegExp('^(\\d+).(\\d+).(\\d+)(\.\\d+)?$', 'gm')
const threeCompartmentSemver = new RegExp('^(\\d+).(\\d+).(\\d+)$', 'gm')

const isValidSimpleSemver = (item: string) => Boolean(item?.match(simpleSemverRx))

const needsRevision = (version: string) => Boolean(version?.match(threeCompartmentSemver))

const addRevision = (version: string) => {
  if (!needsRevision(version)) return version
  return `${version}.0`
}

// returns the latest version between two options (not considering flags)
// adds revision (as .0) if it doesn't exist already
const latestVersion = (cdrVersion: string | any, templateVersion: string | any): string | null => {
  const noFlagsCdrSemver = removeFlags(cdrVersion)
  const noFlagsTemplateSemver = removeFlags(templateVersion)

  const validCdrSemver = semver.valid(cdrVersion)
  const validTemplateSemver = semver.valid(templateVersion)

  // if both options are valid semvers, return the one that is greater than the other
  if (validCdrSemver && validTemplateSemver) {
    return semver.gt(noFlagsCdrSemver, noFlagsTemplateSemver) ? addRevision(noFlagsCdrSemver) : addRevision(noFlagsTemplateSemver)
    // if neither option is valid, return null
  } else if (!validCdrSemver && !validTemplateSemver) {
    return null
    // otherwise, only one is valid; return whichever is valid format
  } else {
    return validCdrSemver ? addRevision(noFlagsCdrSemver) : addRevision(noFlagsTemplateSemver)
  }
}

// the semver package we're using doesn't recognize 2.2.2.2-draft
// as a valid semver... convert it so we can use the comparison functions
// for 4 compartments, it wants something like 2.3.4+2-draft
const convertSemverForPackage = (semverStr: string) => {
  const [mainSemverBody, tag] = semverStr.split('-')
  const [major, minor, patch, release] = mainSemverBody.split('.')
  let semverForLib = `${major}.${minor}.${patch}`
  if (release) {
    semverForLib = `${semverForLib}+${release}`
  } if (tag) {
    semverForLib = `${semverForLib}-${tag}`
  }
  return semverForLib
}

const convertBackToCqfSemver = (libSemver: string) => libSemver.replace('+', '.')

const getLatestFromList = (versions: string[]) => {
  const filteredVersions = versions.filter(v => isValidSimpleSemver(removeFlags(v)))
  const mappedVersions = filteredVersions.map(v => convertSemverForPackage(v))
  const sorted = sort(mappedVersions)
  return convertBackToCqfSemver(sorted[sorted.length - 1] || "")
}

export {
  latestVersion,
  isValidSimpleSemver,
  getLatestFromList
}
