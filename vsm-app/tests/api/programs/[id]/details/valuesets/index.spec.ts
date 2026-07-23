import { getProgramDetailsValuesets } from '@/pages/api/programs/[id]/details/valuesets'
import { getProgram, getGrouperLibrary, getGrouperValuesets } from '@/helpers/server/serverLibraryHelper'
import { fetchLeafValueSets } from '@/helpers/server/serverValueSetHelper'

// jest.mock needs a resolvable relative path here - the @/ alias isn't picked up by
// babel-plugin-jest-hoist in this project's jest config, even though normal imports work with it
jest.mock('../../../../../../helpers/server/serverLibraryHelper')
jest.mock('../../../../../../helpers/server/serverValueSetHelper')

describe('/api/programs/[id]/details/valuesets', () => {
  describe('getProgramDetailsValuesets', () => {
    const bareUrl = 'http://example.com/ValueSet/foo'

    beforeEach(() => {
      jest.resetAllMocks()
      ;(getProgram as jest.Mock).mockResolvedValue({ resourceType: 'Library', id: 'program-1', name: 'Program 1' })
      ;(getGrouperLibrary as jest.Mock).mockResolvedValue({ resourceType: 'Library', id: 'grouper-lib' })
      // one grouper (dxtc) includes the pinned canonical, a different grouper (sdtc) includes
      // the unpinned canonical for the same bare url
      ;(getGrouperValuesets as jest.Mock).mockResolvedValue([
        {
          resourceType: 'ValueSet',
          id: 'dxtc',
          url: 'http://example.com/ValueSet/dxtc',
          title: 'dxtc',
          compose: { include: [{ valueSet: [`${bareUrl}|1.0`] }] }
        },
        {
          resourceType: 'ValueSet',
          id: 'sdtc',
          url: 'http://example.com/ValueSet/sdtc',
          title: 'sdtc',
          compose: { include: [{ valueSet: [bareUrl] }] }
        }
      ])
      ;(fetchLeafValueSets as jest.Mock).mockResolvedValue([
        { resourceType: 'ValueSet', id: 'foo-pinned', url: bareUrl, version: '1.0', pinnedCanonical: `${bareUrl}|1.0` },
        { resourceType: 'ValueSet', id: 'foo-unpinned', url: bareUrl, version: 'latest', pinnedCanonical: bareUrl }
      ])
    })

    it('keeps grouper membership and pinned version independent for a pinned and unpinned row sharing the same bare url', async () => {
      const { status, payload } = (await getProgramDetailsValuesets({ id: 'program-1' })) as any

      expect(status).toBe(200)
      expect(payload.data).toHaveLength(2)

      const pinnedRow = payload.data.find((row: any) => row.valueSet.id === 'foo-pinned')
      const unpinnedRow = payload.data.find((row: any) => row.valueSet.id === 'foo-unpinned')

      // the pinned row only belongs to dxtc (the grouper that actually composes the pinned canonical)
      expect(pinnedRow.groups?.map((g: any) => g.id)).toStrictEqual(['dxtc'])
      expect(pinnedRow.valueSetPinnedVersion).toBe('1.0')

      // the unpinned row only belongs to sdtc, and has no pinned version - it must not inherit
      // dxtc's membership or pin just because it shares the same bare ValueSet.url
      expect(unpinnedRow.groups?.map((g: any) => g.id)).toStrictEqual(['sdtc'])
      expect(unpinnedRow.valueSetPinnedVersion).toBeUndefined()
    })
  })
})
