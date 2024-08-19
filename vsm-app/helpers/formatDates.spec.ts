import { formatDateForTable } from './formatDates'

describe('formatDates', () => {
  describe('formatDateForTable', () => {
    it('creates the correct date structure in m/d/yyyy format', () => {
      const testDate = '2023-08-08T19:57:51.344+00:00'
      expect(formatDateForTable(testDate, 'm/d/yyyy')).toBe('8/8/2023')
    })

    it('creates the correct date structure in number format', () => {
      const testDate = 1724716800000
      expect(formatDateForTable(testDate, 'm/d/yyyy')).toContain('8/')
      expect(formatDateForTable(testDate, 'm/d/yyyy')).toContain('/2024')
    })

    it('returns empty string if input is not a string', () => {
      const notDate = null
      expect(formatDateForTable(notDate, 'm/d/yyyy')).toBe('')
    })

    it('returns empty string if input is not a valid date', () => {
      const notDate = '1123423'
      expect(formatDateForTable(notDate, 'm/d/yyyy')).toBe('')
    })
  })
})