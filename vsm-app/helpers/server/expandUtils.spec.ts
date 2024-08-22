import { buildSearchUrl } from './expandUtils'

describe('buildSearchUrl', () => {
  it('returns the proper base if no version present', () => {
    const leafUrl = 'http://test.com'
    const leafVersion = undefined
    expect(buildSearchUrl({ leafUrl, leafVersion })).toBe('/ValueSet?url=http://test.com&_sort=-version&_count=1')
  })

  it('returns url with version if specified', () => {
    const leafUrl = 'http://test.com'
    const leafVersion = '2.0.0'
    expect(buildSearchUrl({ leafUrl, leafVersion })).toBe('/ValueSet?url=http://test.com&_sort=-version&_count=1&version=2.0.0')
  })
})