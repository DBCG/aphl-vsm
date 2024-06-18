import semver from 'semver'
import sort from 'semver/functions/sort'

const removeFlags = (item: string) => {
  const split = item?.split('-')
  if (split?.length > 2) {
    throw new Error("Version contains multiple hyphens and the flag cannot be parsed: " + item)
  }
  return item?.split('-')?.[0]
}

const threeCompartmentSemver = new RegExp('^(\\d+).(\\d+).(\\d+)$', 'gm')

const isValidSimpleSemver = (item: string) => Boolean(item?.match(threeCompartmentSemver))

// returns the latest version between two options (not considering flags)
const latestVersion = (cdrVersion: string, templateVersion: string): string | null => {
  let noFlagsCdrSemver = null
  try {
    noFlagsCdrSemver = removeFlags(cdrVersion)
  } catch (error) {
    // leave it null
  }
  let noFlagsTemplateSemver = null
  try {
    noFlagsTemplateSemver = removeFlags(templateVersion)
  } catch (error) {
    // leave it null
  }

  const validCdrSemver = semver.valid(cdrVersion)
  const validTemplateSemver = semver.valid(templateVersion)

  // if both options are valid semvers, return the one that is greater than the other
  if (!!noFlagsCdrSemver && !!noFlagsTemplateSemver && validCdrSemver && validTemplateSemver) {
    return semver.gt(noFlagsCdrSemver, noFlagsTemplateSemver) ? noFlagsCdrSemver : noFlagsTemplateSemver
    // if neither option is valid, return null
  } else if (!validCdrSemver && !validTemplateSemver) {
    return null
    // otherwise, only one is valid; return whichever is valid format
  } else {
    return validCdrSemver ? noFlagsCdrSemver : noFlagsTemplateSemver
  }
}


const convertBackToCqfSemver = (libSemver: string) => libSemver.replace('+', '.')

const getLatestFromList = (versions: string[]) => {
  const filteredVersions = versions.filter(v => isValidSimpleSemver(removeFlags(v)))
  const sorted = sort(filteredVersions)
  return convertBackToCqfSemver(sorted[sorted.length - 1] || "")
}

export {
  latestVersion,
  isValidSimpleSemver,
  getLatestFromList
}
