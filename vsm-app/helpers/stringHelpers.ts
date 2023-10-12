const stripFromName = (str: string) => {
  const trimmed = str.trim()

  if (trimmed === '') return trimmed

  const cleaned = trimmed.replace(/[^a-zA-Z0-9\w]/g, '_')
  return cleaned
}

const startsAlphabetically = (title: string) => {
  const regex = /^[A-Za-z]/
  return Boolean(title?.trim().match(regex))
}

const capitalizeFirstLetter = (title: string) => {
  return title.charAt(0).toUpperCase() + title.slice(1)
}

// FHIR names have some rules around their composition
// example: https://build.fhir.org/valueset-definitions.html#ValueSet.name
// rules: 
// 1. Must start uppercase LETTER
// 2. May contain numbers, may contain upper or lowercase letters a to z
// 3. No spaces
// 4. No symbols except underscore _
// 5. FHIR names do NOT need to be unique
const generateNameFromTitle = (title: string | undefined, defaultName: string) => {
  // if title doesn't exist (it's not required) then just use the default name
  if (!title || title.trim() === '') {
    return defaultName
  }
  const disallowedItemsRx = new RegExp('[^a-z,A-Z,0-9,_]', 'g')
  const startsWithLetterRx = new RegExp('^[a-z,A-Z]')
  // replace all characters not matching allowed with _
  const cleanedName = stripFromName(title).replace('__', '_')

  // lastly, ensure name starts with uppercase letter, adjust if not
  const startsWithLetter = startsWithLetterRx.test(cleanedName)

  if (startsWithLetter) {
    return capitalizeFirstLetter(cleanedName)
  } else {
    // just in case users didn't start their human-readable title with a letter
    // find the first letter used in the title
    const anyLetterRx = new RegExp('[a-z,A-Z]')
    const indexOfFirstLetter = cleanedName.search(anyLetterRx)
    const firstLetter = indexOfFirstLetter > -1 ? cleanedName.charAt(indexOfFirstLetter).toUpperCase() : 'A'
    return `${firstLetter}${cleanedName}`
  }
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
  isFhirDateTime
}
