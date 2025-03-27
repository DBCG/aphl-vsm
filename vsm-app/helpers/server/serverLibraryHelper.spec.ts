import { getProgram, getGrouperLibrary, getGrouperValuesets } from './serverLibraryHelper'
import FhirClient from '@/backend/clients/FhirCdrClient'

jest.mock('fhir-kit-client')

describe('serverLibraryHelper', () => {
  describe('getProgram', () => {
    it('should throw an error if the program is not a FHIR Library', async () => {
      const programId = 'programId'
      FhirClient.getInstance().read = jest.fn().mockResolvedValue({ resourceType: 'OperationalOutcome' })
      await expect(getProgram(programId)).rejects.toThrow(`Program ${programId} must be a FHIR Library`)
    })

    it('should return the program if it is a FHIR Library', async () => {
      const programId = 'programId'
      const program = { resourceType: 'Library' }
      FhirClient.getInstance().read = jest.fn().mockResolvedValue(program)
      await expect(getProgram(programId)).resolves.toEqual(program)
    })

    it('should throw an error if the program is not found', async () => {
      const programId = 'programId'
      FhirClient.getInstance().read = jest.fn().mockRejectedValue(new Error('Not found'))
      await expect(getProgram(programId)).rejects.toThrow('Not found')
    })
  })

  describe('getGrouperLibrary', () => {
    it('should throw an error if the grouper library canonical is not found', async () => {
      const program = { id: 'programId', relatedArtifact: [] } as any
      await expect(getGrouperLibrary(program)).rejects.toThrow(`Could not find Grouper Library canonical for Program ${program.id}`)
    })

    it('should throw an error if the grouper library is not found', async () => {
      const program = {
        id: 'programId',
        relatedArtifact: [{ type: 'composed-of', resource: 'http://ersd.aimsplatform.org/fhir/Library/rctc|2022-11-19' }],
        status: 'active'
      }
      FhirClient.getInstance().search = jest.fn().mockResolvedValue({ entry: [] })
      await expect(getGrouperLibrary(program)).rejects.toThrow(`Could not get Grouper Library for Program ${program.id}`)
    })

    it('should return the grouper library if it is found', async () => {
      const program = {
        id: 'programId',
        relatedArtifact: [{ type: 'composed-of', resource: 'http://ersd.aimsplatform.org/fhir/Library/rctc|2022-11-19' }],
        status: 'active'
      }
      const grouperLibrary = { resourceType: 'Library', id: 'grouperLibraryId' }
      FhirClient.getInstance().search = jest.fn().mockResolvedValue({ entry: [{ resource: grouperLibrary }] })
      await expect(getGrouperLibrary(program)).resolves.toEqual(grouperLibrary)
    })
  })

  describe('getGrouperValuesets', () => {
    it('should throw an error if no grouper valuesets are linked to the library', async () => {
      const grouperLib = { id: 'grouperLibraryId', relatedArtifact: [] } as any
      await expect(getGrouperValuesets(grouperLib)).rejects.toThrow(`No Grouper Valuesets linked to Library ${grouperLib.id}`)
    })

    it('should throw an error if no grouper valuesets are found', async () => {
      const grouperLib = {
        id: 'grouperLibraryId',
        relatedArtifact: [{ type: 'composed-of', resource: 'http://ersd.aimsplatform.org/fhir/ValueSet/rctc|2022-11-19' }]
      }
      FhirClient.getInstance().search = jest.fn().mockResolvedValue([])
      await expect(getGrouperValuesets(grouperLib)).rejects.toThrow(`No Grouper Valuesets found for Library ${grouperLib.id}`)
    })

    it('should return the grouper valuesets if they are found', async () => {
      const grouperLib = {
        id: 'grouperLibraryId',
        relatedArtifact: [{ type: 'composed-of', resource: 'http://ersd.aimsplatform.org/fhir/ValueSet/rctc|2022-11-19' }]
      }
      const grouperValueset = { resourceType: 'ValueSet', id: 'grouperValuesetId' }
      FhirClient.getInstance().search = jest.fn().mockResolvedValue({resourceType: 'Bundle', entry: [{ resource: grouperValueset }]})
      await expect(getGrouperValuesets(grouperLib)).resolves.toEqual([grouperValueset])
    })
  })
})
