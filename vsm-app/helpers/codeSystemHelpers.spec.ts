import { DeleteData, UpdateData } from '@/pages/api/codesystem/provisional'
import { updateCsCodeItem } from './codeSystemHelpers'

const startingCs: fhir4.CodeSystem = {
  resourceType: 'CodeSystem',
  content: 'complete',
  url: 'test',
  status: 'draft',
  concept: [
    {
      code: 'test-code',
      display: 'test-display',
      definition: 'test-definition'
    },
    {
      code: 'test-code-1',
      display: 'test-display-1',
      definition: 'test-definition-1'
    }
  ]
}

const updates1 = {
  action: 'replace-code',
  codeUpdates: [
    {
      old: {code: 'test-code-1', display: 'test-display-1', definition: 'test-definition-1'},
      new: {code: 'test-code-2', display: 'test-display-2', definition: 'test-definition-2'}
    }
  ],
  inValueSets: [],
  id: '234'
} as UpdateData

const updates2 = {
  action: 'replace-code',
  codeUpdates: [
    {
      old: {code: 'test-code-nonexistent', display: 'test-display-1', definition: 'test-definition-1'},
      new: {code: 'test-code-2', display: 'test-display-2', definition: 'test-definition-2'}
    }
  ],
  inValueSets: [],
  id: '123'
} as UpdateData

const expectedResult1 = {
  resourceType: 'CodeSystem',
  content: 'complete',
  url: 'test',
  status: 'draft',
  concept: [
    {
      code: 'test-code',
      display: 'test-display',
      definition: 'test-definition'
    },
    {
      code: 'test-code-2',
      display: 'test-display-2',
      definition: 'test-definition-2'
    }
  ]
}


describe('codeSystemHelpers', () => {

  describe('updateCsCodeItem', () => {
    it('updates the proper code in the system when it exists', () => {
      expect(updateCsCodeItem({
        cs: startingCs,
        action: 'replace-code',
        updateData: updates1
      })).toEqual(expectedResult1)
    })

    it('throws error if code item does not exist for update', () => {
      const result = updateCsCodeItem({
        cs: startingCs,
        action: 'replace-code',
        updateData: updates2
      })
      expect(result).toEqual({"error": "Failed to replace code in system with url test"})
    })

    it('deletes a code if it exists', () => {
      const result = updateCsCodeItem({
        cs: startingCs,
        action: 'delete-code',
        updateData: ({
          action: 'delete-code',
          codeUpdates: [{code: 'test-code', display: 'test-display', definition: 'test-definition'}],
          inValueSets: [],
          id: '123'
        } as DeleteData)
        })
        expect(result).toEqual({
          resourceType: 'CodeSystem',
          content: 'complete',
          url: 'test',
          status: 'draft',
          concept: [
            {
              code: 'test-code-1',
              display: 'test-display-1',
              definition: 'test-definition-1'
            }
          ]
        })
      })
      it('throws error if does not find code', () => {
        const result = updateCsCodeItem({
          cs: startingCs,
          action: 'delete-code',
          updateData: ({
            action: 'delete-code',
            codeUpdates: [{code: 'test-code-none', display: 'test-display', definition: 'test-definition'}],
            inValueSets: [],
            id: '123'
          } as DeleteData)
          })
          expect(result).toEqual({ error: "Failed to delete code in system with url test" })
        })
    })
})