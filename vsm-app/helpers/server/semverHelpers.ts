import semver from 'semver'

const latestVersion = (cdrVersion: string | any, templateVersion: string | any): string | null => {
  const validCdrSemver = semver.valid(cdrVersion)
  const validTemplateSemver = semver.valid(templateVersion)

  // if both options are valid semvers, return the one that is greater than the other
  if (validCdrSemver && validTemplateSemver) {
    return semver.gt(cdrVersion, templateVersion) ? cdrVersion : templateVersion
    // if neither option is valid, return null
  } else if (!validCdrSemver && !validTemplateSemver) {
    return null
    // otherwise, only one is valid; return whichever is valid format
  } else {
    return validCdrSemver ? cdrVersion : templateVersion
  }
}

export { latestVersion }