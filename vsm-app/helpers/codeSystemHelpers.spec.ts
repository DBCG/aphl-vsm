import { UpdateData } from '@/pages/api/codesystem/provisional'
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
  action: 'replace',
  codeUpdates: [
    {
      old: {code: 'test-code-1', display: 'test-display-1', definition: 'test-definition-1'},
      new: {code: 'test-code-2', display: 'test-display-2', definition: 'test-definition-2'}
    }
  ],
  inValueSets: []
} as UpdateData

const updates2 = {
  action: 'replace',
  codeUpdates: [
    {
      old: {code: 'test-code-nonexistent', display: 'test-display-1', definition: 'test-definition-1'},
      new: {code: 'test-code-2', display: 'test-display-2', definition: 'test-definition-2'}
    }
  ],
  inValueSets: []
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
        action: 'replace',
        updateData: updates1
      })).toEqual(expectedResult1)
    })

    it('throws error if code item does not exist', () => {
      const result = updateCsCodeItem({
        cs: startingCs,
        action: 'replace',
        updateData: updates2
      })
      expect(result).toEqual({"error": "Failed to replace code in system with url test"})
    })
  })

})