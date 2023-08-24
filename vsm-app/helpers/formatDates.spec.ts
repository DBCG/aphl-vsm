import { formatDateForTable } from './formatDates'

describe('formatDates', () => {
  describe('formatDateForTable', () => {
    it('creates the correct date structure in m/d/yyyy format', () => {
      const testDate = '2023-08-08T19:57:51.344+00:00'
      expect(formatDateForTable(testDate, 'm/d/yyyy')).toBe('8/8/2023')
    })

    it('returns empty string if input is not a string', () => {
      const notDate = null
      expect(formatDateForTable(null, 'm/d/yyyy')).toBe('')
    })

    it('returns empty string if input is not a valid date', () => {
      const notDate = '1123423'
      expect(formatDateForTable(notDate, 'm/d/yyyy')).toBe('')
    })
  })
})