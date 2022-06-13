// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, vsacFhirClient } from 'fhirClients'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  // get ValueSets by id
  if (req.method === 'GET') {
    try {
      const response = await vsacFhirClient.search({ resourceType: 'ValueSet' })

      res.status(200).send(response)
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  } if (req.method === 'PUT') {
    const body = await req.body
    const bodyJson = JSON.parse(body)
    console.log('body: ', bodyJson)
    const existingVSets = await Promise.all(bodyJson?.selectedValueSets?.map(item => (
      fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: item.url,
          // version: item.version
        }
      })
    )
    ))

    const filteredVSets = existingVSets
      ?.filter(x => x)
      ?.map(item => item?.entry?.[0]?.resource)

    console.log('filtered: ', filteredVSets)
    let vSetsToUpdate = []

    for (const selectedVS of bodyJson.selectedValueSets) {
      let vsToUpdate
      const matchingValueSetInCQF = filteredVSets?.find(vs => vs?.url === selectedVS?.url && vs?.version === selectedVS?.version)
      if (matchingValueSetInCQF) {
        vsToUpdate = matchingValueSetInCQF
        vSetsToUpdate.push({ method: 'PUT', valueSet: matchingValueSetInCQF })
      } else {
        const matchingVSetsFromRemoteServer = await vsacFhirClient.search({
          resourceType: 'ValueSet',
          searchParams: {
            url: selectedVS.url,
            // version: selectedVS.version
          }
        })

        const matchingVSFromRemote = matchingVSetsFromRemoteServer?.entry?.[0]?.resource

        if (matchingVSFromRemote) {
          matchingVSFromRemote.url = matchingVSetsFromRemoteServer?.entry?.[0]?.fullUrl
          vSetsToUpdate.push({ method: 'POST', valueSet: matchingValueSetInCQF })
        } else {
          console.error('no match found')
        }
      }

      // update valueset with conditions here
      // then PUT or POST depending
      // if all are successful, return 200
    }

    // handle if no vsets to update, too
    // add conditions to valueSet
    const updatedValueSets = vSetsToUpdate?.map(vs => {

    })

    res.status(400).json({ error: 'test' })
  }
}
