import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'
import { updateConditions } from '@/helpers/conditionHelpers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {

    const id = req.query.id as string
    const decodedUrl = decodeURIComponent(id)

    try {

      const response = await vsacFhirClient.search({
        resourceType: 'ValueSet',
        // searchParams: { 'url': decodedUrl }
      })

      res.status(200).send(response)
    } catch (e) {
      console.error('error: ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  } else if (req.method === 'PUT') {
    try {
      const body = await JSON.parse(req.body)
      console.log('body: ', body)
      const decodedUrl = decodeURIComponent(body.canonical)
      console.log('hello')

      const valueSetBundleToEdit = await fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: decodedUrl,
          version: body.version
        }
      })

      const valueSetToEdit = valueSetBundleToEdit?.entry?.[0]?.resource
      console.log('valueSet to edit: ', valueSetToEdit)

      const editedVs = updateConditions(valueSetToEdit, body.conditionInfo)
      console.log('editedVS: ', editedVs)

      res.status(200).send(valueSetToEdit)
    } catch (e) {
      res.status(400).json({ error: 'ValueSet PUT failed' })
    }

  }
}