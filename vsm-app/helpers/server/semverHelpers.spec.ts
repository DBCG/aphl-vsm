import { latestVersion, isValidSimpleSemver } from './semverHelpers'

describe('semverHelpers', () => {
  describe('latestVersion', () => {
    it('returns the newer of two valid semvers', () => {
      const cdrSemver = '2.0.0'
      const templateSemver = '1.0.0'
      const result = latestVersion(cdrSemver, templateSemver)
      expect(result).toBe('2.0.0')
    })

    it('returns only one semver if only one is valid', () => {
      const cdrSemverInvalid = 'eee'
      const templateSemver = '1.0.0'
      const result1 = latestVersion(cdrSemverInvalid, templateSemver)
      expect(result1).toBe('1.0.0')

      const cdrSemver = '2.0.0'
      const templateSemverInvalid = null
      const result2 = latestVersion(cdrSemver, templateSemverInvalid)
      expect(result2).toBe('2.0.0')
    })

    it('returns null if neither valid semver', () => {
      const cdrSemverInvalid = 'cat-dog-bird'
      const templateSemverInvalid = '1,000'
      const result = latestVersion(cdrSemverInvalid, templateSemverInvalid)
      expect(result).toBe(null)
    })

    it('ignores "draft" designation in comparison', () => {
      const cdrSemverDraft = '2.0.0-draft'
      const templateSemver = '2.0.0'
      const result1 = latestVersion(cdrSemverDraft, templateSemver)
      expect(result1).toBe('2.0.0')

      const templateSemver2 = '1.0.0'
      const result2 = latestVersion(cdrSemverDraft, templateSemver2)
      expect(result2).toBe('2.0.0')
    })
  })

  describe('isValidSimpleSemver', () => {
    it('returns true if valid MAJOR.MINOR.PATCH semver format', () => {
      expect(isValidSimpleSemver('2.0.0')).toBe(true)
      expect(isValidSimpleSemver('20.10.10')).toBe(true)
      expect(isValidSimpleSemver('0.10.0')).toBe(true)
      expect(isValidSimpleSemver('20.10.101')).toBe(true)
    })

    it('returns false if invalid format', () => {
      expect(isValidSimpleSemver('2.0.0-draft')).toBe(false)
      expect(isValidSimpleSemver('20.10.10.92')).toBe(false)
      expect(isValidSimpleSemver('0.10')).toBe(false)
      expect(isValidSimpleSemver('invalid!')).toBe(false)
      expect(isValidSimpleSemver('')).toBe(false)
    })
  })
})