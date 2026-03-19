import TerminologyFhirClient from './TerminologyFhirClient' // adjust path as needed
import { tsCredentialService } from '@/backend/services/TsCredentialService'

jest.mock('../services/TsCredentialService', () => ({
  tsCredentialService: {
    getVsacCredentials: jest.fn((userId) =>
      Promise.resolve({ username: 'testUser', password: 'testPass' })
    ),
  },
}))

describe('TerminologyFhirClient', () => {
  it('getClientName should return "vsac" by default', () => {
    expect(TerminologyFhirClient.getClientName()).toBe('vsac')
  })

  it('getClient sets auth if userId is provided and returns a decorated vsac client', async () => {
    // Ensure the credential service returns our dummy credentials.
    const creds = { username: 'testUser', password: 'testPass' };
    (tsCredentialService.getVsacCredentials as jest.Mock).mockResolvedValue(creds)

    // Set up dummy search and read methods on the client
    TerminologyFhirClient.client!.search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      entry: [],
    })
    TerminologyFhirClient.client!.read = jest.fn().mockResolvedValue({
      resourceType: 'ValueSet',
    })

    const client = await TerminologyFhirClient.getClient('user123')

    // Verify that credentials were fetched
    expect(tsCredentialService.getVsacCredentials).toHaveBeenCalledWith('user123')

    // Check that the auth header is set correctly
    const expectedAuth = `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`
    expect((TerminologyFhirClient.client!.customHeaders as Record<string, string>)['Authorization']).toBe(expectedAuth)

    // Verify that the returned client is decorated (i.e. its search method is replaced)
    expect(client.search).not.toBe(TerminologyFhirClient.client!.search)
  })

  it('getClient returns client if auth is already set and no userId provided', async () => {
    // Manually set the auth header on the client.
    TerminologyFhirClient.client!.customHeaders = { Authorization: 'Basic dummyAuth' }
    // Also, provide dummy implementations for search and read.
    TerminologyFhirClient.client!.search = jest.fn().mockResolvedValue({
      resourceType: 'Bundle',
      entry: [],
    })
    TerminologyFhirClient.client!.read = jest.fn().mockResolvedValue({
      resourceType: 'ValueSet',
    })

    // Since auth is already set, no userId is needed.
    const client = await TerminologyFhirClient.getClient()

    // Should not throw and should return a decorated client.
    expect(client.search).not.toBe(TerminologyFhirClient.client!.search)
  })

  it('getClient throws an error if auth is not set and no userId provided', async () => {
    // Ensure the client does not have auth set.
    TerminologyFhirClient.client!.customHeaders = {}

    await expect(TerminologyFhirClient.getClient()).rejects.toThrow(
      'Terminology credentials are required to access the terminology server'
    )
  })

  it('setCustomClient should update the client and clientName', () => {
    const newBaseUrl = 'http://custom-url'
    const newAuthHeader = 'customAuth'
    TerminologyFhirClient.setCustomClient({
      baseUrl: newBaseUrl,
      clientName: 'custom',
      basicAuthHeader: newAuthHeader,
    })

    expect(TerminologyFhirClient.client!.baseUrl).toBe(newBaseUrl)
    expect((TerminologyFhirClient.client!.customHeaders as Record<string, string>)['Authorization']).toBe(`Basic ${newAuthHeader}`)
    expect(TerminologyFhirClient.getClientName()).toBe('custom')
  })
})