import {
  stripFromName,
  startsAlphabetically,
  capitalizeFirstLetter,
  generateNameFromTitle
} from './stringHelpers'

describe('stringHelpers', () => {
  // helpers to generate a FHIR valueset name from a title string
  // in FHIR, the name must conform to certain
  describe('stripFromName', () => {
    it('should replace all non alpha/numeric characters with underscores', () => {
      const testInput1 = 'the?wind-is"tossing[the>lilacs'
      const expected1 = 'the_wind_is_tossing_the_lilacs'

      const testInput2 = 'the(new=leaves~laugh|in,the}sun'
      const expected2 = 'the_new_leaves_laugh_in_the_sun'

      expect(stripFromName(testInput1)).toBe(expected1)
      expect(stripFromName(testInput2)).toBe(expected2)
    })

    it('should trim whitespace from either side of string', () => {
      const testInput3 = ' this-will-be-stripped '
      const expected3 = 'this_will_be_stripped'
      expect(stripFromName(testInput3)).toBe(expected3)
    })
  })

  describe('startsAlphabetically', () => {
    it('returns true if string starts with letter, false if not', () => {
      const testInput4 = '1willfail'
      const expected4 = false

      const testInput5 = 'willpass'
      const expected5 = true

      expect(startsAlphabetically(testInput4)).toBe(expected4)
      expect(startsAlphabetically(testInput5)).toBe(expected5)
    })
  })

  describe('capitalizeFirstLetter', () => {
    it('returns a string with first letter capitalized', () => {
      const testInput6 = 'alrightAlrightAlright'
      const expected6 = 'AlrightAlrightAlright'
      expect(capitalizeFirstLetter(testInput6)).toBe(expected6)
    })
  })

  describe('generateNameFromTitle', () => {
    it('returns the default if title was not present', () => {
      const testTitle1 = ''
      const testTitle2 = undefined

      const expected1 = 'Default'
      const expected2 = 'Default2'
      expect(generateNameFromTitle(testTitle1, 'Default')).toBe(expected1)
      expect(generateNameFromTitle(testTitle2, 'Default2')).toBe(expected2)
    })
  })

  it('returns properly formatted names from incompatible titles', () => {
    const testTitle1 = ' ? this is a title '
    const testTitle2 = ' (a test) title '

    const expected1 = 'T_this_is_a_title'
    const expected2 = 'A_a_test_title'
    expect(generateNameFromTitle(testTitle1, 'Default')).toBe(expected1)
    expect(generateNameFromTitle(testTitle2, 'Default2')).toBe(expected2)
  })
})
