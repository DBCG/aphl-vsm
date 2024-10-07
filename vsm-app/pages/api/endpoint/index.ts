import { fhirCdrClient } from '@/fhirClients'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { FhirResource } from 'fhir-kit-client'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { VSMSession } from '@/helpers/rolesHelper'
import { getServerSession } from 'next-auth'
import { AuthOptions } from '../auth/[...nextauth]'
export interface EndpointRequest extends NextApiRequest {
  body: {
    endpoint: fhir4.Endpoint
  }
}
export interface EndpointResponse {
  endpoints: fhir4.Endpoint[]
  total: number
}
const updateEndpoint = async (req: EndpointRequest, res: NextApiResponse<fhir4.Endpoint | FhirResource>) => {
  if (!req.body?.endpoint?.address?.trim()) {
    throw 'Missing address/URL on submitted resource'
  }
  if (!req.body?.endpoint?.name?.trim()) {
    throw 'Missing human-readable name on submitted resource'
  }
  // add/edit endpoint
  let updatedEndpoint: FhirResource | fhir4.Endpoint
  if (req.body?.endpoint?.id) {
    updatedEndpoint = await fhirCdrClient.update<fhir4.Endpoint>({
      resourceType: 'Endpoint',
      id: req.body?.endpoint?.id,
      body: req.body?.endpoint
    })
  } else {
    updatedEndpoint = await fhirCdrClient.create<fhir4.Endpoint>({
      resourceType: 'Endpoint',
      body: req.body?.endpoint
    })
  }
  res.status(200).send(updatedEndpoint)
}

const getEndpoints = async (req: NextApiRequest, res: NextApiResponse<EndpointResponse>) => {
  if (process.env.NEXT_PUBLIC_ENABLE_TERMINOLOGY_ENDPOINT === 'false' || process.env.NEXT_PUBLIC_ENABLE_TERMINOLOGY_ENDPOINT == null) {
    res.status(200).send({ endpoints: [], total: 0 })
  }
  const endpointBundle = (await fhirCdrClient.search({
    resourceType: 'Endpoint',
    searchParams: {
      _total: 'accurate',
      status: 'active',
      _count: req.query['_count'] || '',
      _offset: req.query['_offset'] || '',
      identifier: 'terminologyEndpoint'
    }
  })) as fhir4.Bundle

  let endpoints = endpointBundle?.entry?.map((e) => e.resource as fhir4.Endpoint) || []
  if (req.query.user_set) {
    // This option will filter and return only those endpoints that the user has set credentials for
    const session = <VSMSession>await getServerSession(req, res, AuthOptions)
    const creds = await tsCredentialService.getAllCredentials(session.user.id)
    const endpointIds = new Set(creds.map((cred) => cred.terminologyServerId))
    endpoints = endpoints.filter((ep) => endpointIds.has(ep.id!))
  }

  res.status(200).send({ endpoints, total: endpoints?.length || 0 })
}
export default handler({
  POST: {
    action: updateEndpoint,
    access: ['admin']
  },
  GET: {
    action: getEndpoints
  }
})
