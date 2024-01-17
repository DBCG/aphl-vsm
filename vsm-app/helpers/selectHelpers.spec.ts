import { buildGroupOptions } from './selectHelpers'
describe('selectHelpers', () => {
  describe('buildGroupOptions', () => {
    it('returns empty array if no groupVsets', () => {
      const testInput1 = undefined
      const testInput2 = []
      const expected = []
      expect(buildGroupOptions(testInput1)).toEqual(expected)
      expect(buildGroupOptions(testInput2)).toEqual(expected)
    })

    it('returns properly formatted array if groupVsets', () => {
      const testInput1 = [
        {
          id: '1',
          title: 'testTitle1'
        },
        {
          id: '2',
          title: 'testTitle2'
        }
      ]
      const expected = [
        {
          value: '1',
          label: 'testTitle1',
          id: '1'
        },
        {
          value: '2',
          label: 'testTitle2',
          id: '2'
        }
      ]
      expect(buildGroupOptions(testInput1)).toEqual(expected)
    })
  })
})