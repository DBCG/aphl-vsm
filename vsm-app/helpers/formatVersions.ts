// RCKMS asked that rxnorm and snomed codesystem versions be presented in format
// <YYYY>-<MM>

export const convertSnomedVersion = (originalVersion: string): string => {
  let version = originalVersion
  // regex for 8 digit number, i.e. 20210408
  const regex = /^[0-9]{8}$/
  if(version.includes('snomed.info')) {
    version = version?.split('/')?.pop() || originalVersion
  }

  if (version.toString().match(regex)) {
    const year = version.substring(0, 4)
    const month = version.substring(4, 6)
    const result = `${year}-${month}`
    return result
  }
  // if version doesn't match that format, just return as-is and don't manipulate
  return version
}

export const convertRxNormVersion = (version: string) => {
  // rxnorm version is MMDDYYYY
  const regex = /^[0-9]{8}$/
  if (version.match(regex)) {
    const year = version.substring(4, 8)
    const month = version.substring(0, 2)
    return `${year}-${month}`
  }
  return version
}