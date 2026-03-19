import semver from 'semver'
import sort from 'semver/functions/sort'

const removeFlags = (item: string) => {
  const split = item?.split('-')
  if (split?.length > 2) {
    return null
  }
  return item?.split('-')?.[0]
}

const threeOrFourCompartmentSemver = new RegExp('^(\\d+).(\\d+).(\\d+).?\\d*$', 'gm')
const threeCompartmentSemver = new RegExp('^(\\d+).(\\d+).(\\d+)$', 'gm')

const isValidThreeOrFourPartSemver = (item: string | null) => Boolean(item?.match(threeOrFourCompartmentSemver))
const isValidSimpleSemver = (item: string) => Boolean(item?.match(threeCompartmentSemver))

// returns the latest version between two options (not considering flags)
const latestVersion = (cdrVersion: string, templateVersion: string): string | null => {
  const noFlagsCdrSemver = removeFlags(cdrVersion)
  const noFlagsTemplateSemver = removeFlags(templateVersion)

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
const normalizeToThreePartSemver = (maybeMoreThanThree: string) => {
  const split = maybeMoreThanThree.split('.');
  if (split.length > 3) {
    return split.slice(0, 3).join('.') + '-' + split.slice(3, split.length).join('-')
  } else {
    return maybeMoreThanThree
  }
}
const getLatestFromList = (versions: string[]) => {
  const filteredNormalizedVersions = versions
    .filter(v => isValidThreeOrFourPartSemver(removeFlags(v)))
    .map(normalizeToThreePartSemver)
  const sorted = sort(filteredNormalizedVersions)
  return convertBackToCqfSemver(sorted[sorted.length - 1] || "")
}

export {
  latestVersion,
  isValidThreeOrFourPartSemver,
  isValidSimpleSemver,
  getLatestFromList
}
