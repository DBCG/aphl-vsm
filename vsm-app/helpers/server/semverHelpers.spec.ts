import { latestVersion, isValidSimpleSemver, getLatestFromList } from './semverHelpers'

describe('semverHelpers', () => {
  describe('latestVersion', () => {
    it('returns the newer of two valid semvers', () => {
      const cdrSemver = '2.0.0'
      const templateSemver = '1.0.0'
      const result = latestVersion(cdrSemver, templateSemver)
      expect(result).toBe('2.0.0.0')
    })

    it('returns only one semver if only one is valid', () => {
      const cdrSemverInvalid = 'eee'
      const templateSemver = '1.0.0'
      const result1 = latestVersion(cdrSemverInvalid, templateSemver)
      expect(result1).toBe('1.0.0.0')

      const cdrSemver = '2.0.0'
      const templateSemverInvalid = null
      const result2 = latestVersion(cdrSemver, templateSemverInvalid)
      expect(result2).toBe('2.0.0.0')
    })

    it('returns null if neither valid semver', () => {
      const cdrSemverInvalid = 'cat-dog-bird'
      const templateSemverInvalid = '1,000'
      const result = latestVersion(cdrSemverInvalid, templateSemverInvalid)
      expect(result).toBe(null)
    })

    it('ignores "draft" designation in comparison', () => {
      const cdrSemverDraft = '2.0.0-draft'
      const templateSemver = '2.0.0.0'
      const result1 = latestVersion(cdrSemverDraft, templateSemver)
      expect(result1).toBe('2.0.0.0')

      const templateSemver2 = '1.0.0'
      const result2 = latestVersion(cdrSemverDraft, templateSemver2)
      expect(result2).toBe('2.0.0.0')
    })
  })

  describe('isValidSimpleSemver with 3', () => {
    it('returns true if valid MAJOR.MINOR.PATCH semver format', () => {
      expect(isValidSimpleSemver('2.0.0')).toBe(true)
      expect(isValidSimpleSemver('20.10.10')).toBe(true)
      expect(isValidSimpleSemver('0.10.0')).toBe(true)
      expect(isValidSimpleSemver('20.10.101')).toBe(true)
    })

    it('returns false if invalid format', () => {
      expect(isValidSimpleSemver('2.0.0-draft')).toBe(false)
      expect(isValidSimpleSemver('0.10')).toBe(false)
      expect(isValidSimpleSemver('invalid!')).toBe(false)
      expect(isValidSimpleSemver('')).toBe(false)
    })
  })

  describe('isValidSimpleSemver with 4', () => {
    it('returns true if valid MAJOR.MINOR.PATCH.TAG semver format', () => {
      expect(isValidSimpleSemver('2.0.0.0')).toBe(true)
      expect(isValidSimpleSemver('20.10.10.1')).toBe(true)
      expect(isValidSimpleSemver('0.10.0.1000')).toBe(true)
      expect(isValidSimpleSemver('20.10.101.90')).toBe(true)
    })

    it('returns false if invalid format', () => {
      expect(isValidSimpleSemver('2.0.0.0-draft')).toBe(false)
      expect(isValidSimpleSemver('0.10.0.-02')).toBe(false)
      expect(isValidSimpleSemver('invalid!.0.0.0')).toBe(false)
      expect(isValidSimpleSemver('0.0.0.0.0')).toBe(false)
    })
  })

  describe('getLatestFromList', () => {
    const UNSORTED_1 = ['0.1.2', '2.3.4', '0.0.0', '3.4.5']
    const EXPECTED_1 = '3.4.5'
    it('returns the latest semver taking into account three compartments', () => {
      expect(getLatestFromList(UNSORTED_1)).toBe(EXPECTED_1)
    })

    const UNSORTED_2 = ['0.1.2.4', '2.3.4', '3.4.5.6', '0.0.0', '3.4.5']
    const EXPECTED_2 = '3.4.5.6'
    it('returns the latest semver taking into account three or 4 compartments', () => {
      expect(getLatestFromList(UNSORTED_2)).toBe(EXPECTED_2)
    })

    const UNSORTED_3 = ['0.1.2.4', '2.3.4-draft', '3.4.5-draft', '0.0.0', '3.4.5.0-draft']
    const EXPECTED_3 = '3.4.5.0-draft'
    it('returns the latest semver taking into account three or 4 compartments with tag', () => {
      expect(getLatestFromList(UNSORTED_3)).toBe(EXPECTED_3)
    })

    const UNSORTED_4 = ['0.1.2.4', 'eee', '2.3.4-draft', '3.4.5-draft', '0.0.0', '3.4.5.0-draft']
    const EXPECTED_4 = '3.4.5.0-draft'
    it('ignores versions with incorrect syntax and does not throw', () => {
      expect(getLatestFromList(UNSORTED_4)).toBe(EXPECTED_4)
    })
  })
})