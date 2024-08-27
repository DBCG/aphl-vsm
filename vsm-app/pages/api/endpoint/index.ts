import { fhirCdrClient } from '@/fhirClients'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { FhirResource } from 'fhir-kit-client'
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
  res
    .status(200)
    .send({ endpoints: endpointBundle?.entry?.map((e) => e.resource as fhir4.Endpoint) || [], total: endpointBundle?.total || 0 })
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
