import { createTableData } from './createTables'
import { changelog } from './changelog'

describe('createTableData', () => {
  it('should build the expected structure for root lib', () => {
    const result = createTableData(changelog)
    const expectedRootLib = {
      'id': [ undefined, '7' ],
      'name': [ undefined, undefined ],
      'version': [ '2022-10-19', '1.0.0.0-draft' ],
      'purpose': [ 'SpecificationLibrary', undefined ],
      'effective start': [ undefined, undefined ],
      'release date': [ undefined, undefined ]
    }

    expect(result.rootLibrary).toStrictEqual(expectedRootLib)
  })

  it('should build the expected structure for grouper data', () => {
    const result = createTableData(changelog)
    const expectedGrouperData = []

    expect(result.grouperPages).toStrictEqual(expectedGrouperData)
  })
})