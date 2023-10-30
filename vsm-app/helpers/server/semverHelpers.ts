import semver from 'semver'

const removeFlags = (item: any) => item?.split('-')?.[0]

const simpleSemverRx = new RegExp('^(\\d+).(\\d+).(\\d+)(\.\\d+)?$', 'gm')
const threeCompartmentSemver = new RegExp('^(\\d+).(\\d+).(\\d+)$', 'gm')

const isValidSimpleSemver = (item: string) => Boolean(item.match(simpleSemverRx))

const needsRevision = (version: string) => Boolean(version.match(threeCompartmentSemver))

const addRevision = (version: string) => {
  if (!needsRevision(version)) return version
  return `${version}.0`
}

// returns the latest version between two options (not considering flags)
const latestVersion = (cdrVersion: string | any, templateVersion: string | any): string | null => {
  const noFlagsCdrSemver = removeFlags(cdrVersion)
  const noFlagsTemplateSemver = removeFlags(templateVersion)

  const validCdrSemver = semver.valid(cdrVersion)
  const validTemplateSemver = semver.valid(templateVersion)

  // if both options are valid semvers, return the one that is greater than the other
  if (validCdrSemver && validTemplateSemver) {
    return semver.gt(noFlagsCdrSemver, noFlagsTemplateSemver) ? noFlagsCdrSemver : noFlagsTemplateSemver
    // if neither option is valid, return null
  } else if (!validCdrSemver && !validTemplateSemver) {
    return null
    // otherwise, only one is valid; return whichever is valid format
  } else {
    return validCdrSemver ? addRevision(noFlagsCdrSemver) : addRevision(noFlagsTemplateSemver)
  }
}

export { latestVersion, isValidSimpleSemver }