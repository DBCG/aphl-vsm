const startsAlphabetically = (title: string) => {
  const regex = /^[A-Za-z]/
  return Boolean(title?.trim().match(regex))
}

const capitalizeFirstLetter = (title: string) => {
  return title.charAt(0).toUpperCase() + title.slice(1)
}

// convert a string (most likely a fhir title) to the proper format
const stripFromName = (str: string) => {
  const trimmed = str.trim()

  if (trimmed === '') return trimmed
  const removedSpecials = trimmed.replace(/[^a-zA-Z0-9\s]/g, ' ')
  let singleSpaces = removedSpecials.replace(/\s+/g, ' ')
  if (!startsAlphabetically(singleSpaces)) {
    singleSpaces = `N ${singleSpaces}`
  }
  const cleaned = singleSpaces.replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join('')

  const result = cleaned.trim()
  return result
}

const splitCanonical = (canonical: string): string[] => {
  const [url, version] = canonical?.split('|')
  if (url && version) {
    return [url, version]
  } else {
    return [url]
  }
}

// From discussing with Adam/Bryn at Smile, we take the following approach:
// - remove all special characters
// - if string doesn't start with a letter, prefix with "N"
// - remove whitespace
const generateNameFromTitle = (title: string | undefined, defaultName: string) => {
  // if title doesn't exist (it's not technically required in FHIR resources) then just use the default name
  if (!title || title.trim() === '') {
    return defaultName
  }
  return stripFromName(title)
}

// https://build.fhir.org/datatypes.html#dateTime
const dateTimeRegex = /^\d{4}-\d{2}-\d{2}$/gm;

// our system is currently only composing effective start date with YYYY-MM-DD format
// but technically could have several formats which the fhir regex supports
const isFhirDateTime = (item: any): boolean => {
  if (typeof item !== 'string') return false
  return dateTimeRegex.test(item)
}

export {
  stripFromName,
  startsAlphabetically,
  capitalizeFirstLetter,
  generateNameFromTitle,
  splitCanonical,
  isFhirDateTime
}
