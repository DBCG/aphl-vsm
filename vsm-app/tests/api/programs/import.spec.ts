import { createMocks } from 'node-mocks-http'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/pages/api/programs/import'
import { NextApiRequest, NextApiResponse } from 'next'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockImplementation(() => ({
        user: {
            roles: ['admin'],
            email: 'superman@gotham.com'
        }
    }))
}))
jest.mock('fhir-kit-client')

describe('/api/import', () => {
    test('should call $ersd-v2-import', async () => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'POST',
            body: {
                resourceType: 'Parameters',
                parameter: []
            }
        })

        await handler(req, res)
        expect(FhirClient.getInstance().operation).toHaveBeenCalledTimes(1)
        expect(FhirClient.getInstance().operation).toHaveBeenCalledWith({
            name: '$ersd-v2-import',
            method: 'POST',
            input: JSON.stringify({
                resourceType: 'Parameters',
                parameter: []
            }),
            options: {
                headers: {
                    'Content-Type': `application/fhir+json`
                }
            }
        })
    })
})
