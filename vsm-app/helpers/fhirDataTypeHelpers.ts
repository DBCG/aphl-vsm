export interface IsValidFormatResponse {
  isValid: boolean
  message: string | null
}

const startsOrEndsWithASpace = (codeItem: string): boolean => {
  return codeItem.match(/^(\s.*|.*\s)$/) !== null
}

const hasMoreThanOneSpaceInARow = (codeItem: string): boolean => {
  return codeItem.match(/\s{2,}/) !== null
}

const exceedsMaxLength = (codeItem: string, maxLength: number): boolean => {
  return codeItem.length > maxLength
}

const isOnlyWhitespace = (codeItem: string): boolean => {
  return codeItem.trim() === ''
}

const containsInvalidCharacters = (codeItem: string): boolean => {
  // strings should not contain unicode points under 32, with these exceptions:
  const allowedUnicodePoints = [
    9, // horizontal tab
    10, // line feed
    13, // carriage return
  ]

  const containsInvalidCharacters = codeItem.split('').some((char) => {
    const charCode = char.charCodeAt(0)
    return charCode < 32 && !allowedUnicodePoints.includes(charCode)
  })

  return containsInvalidCharacters

}

const isValidCode = (codeItem: any): IsValidFormatResponse => {
  if (typeof codeItem !== 'string') return ({ isValid: false, message: 'Codes must be a string' })
  
  if (startsOrEndsWithASpace(codeItem)) return ({ isValid: false, message: 'Codes cannot start or end with a space' })
  
  if (hasMoreThanOneSpaceInARow(codeItem)) return ({ isValid: false, message: 'Codes cannot have more than one space in a row' })

  if (containsInvalidCharacters(codeItem)) return ({ isValid: false, message: 'This entry contains some invalid Unicode characters.' })
  
    else return ({ isValid: true, message: null })
}

const isValidString = (stringItem: any): IsValidFormatResponse => {
  if (typeof stringItem !== 'string') {
    return ({ isValid: false, message: 'Value must be a string' })
  }
  // https://build.fhir.org/datatypes.html#:~:text=Note%20that%20strings%20SHALL%20NOT%20exceed%201%2C048%2C576%20(1024*1024)%20characters%20in%20size.
  if (exceedsMaxLength(stringItem, 1048576)) {
    return ({ isValid: false, message: 'Value cannot exceed 100 characters' })
  }

  if (isOnlyWhitespace(stringItem)) {
    return ({ isValid: false, message: 'Value must contain non-whitespace characters' })
  }
  
  else return ({ isValid: true, message: null })
}

export {
  isValidCode,
  isValidString
}