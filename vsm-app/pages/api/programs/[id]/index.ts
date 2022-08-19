// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { getSession } from 'next-auth/react'

// this only gets the program library
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  const session = await getSession({ req })
  if (!session) {
    res.status(401).end()
  }

  if (req.method === 'GET') {
    try {
      const data = await fhirCdrClient.search({
        resourceType: 'Library',
        searchParams: {
          context: 'triggering-valueset-library',
          id: req.query.id
        }
      })

      const lib = data?.entry?.map((e: any) => e?.resource)
      const json = JSON.stringify(lib)
      res.status(200).send(json)

    } catch (e: any) {
      console.error('error:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for program by id failed.' })
    }
  } else if (req.method === 'PUT') {
    // update the program by id
    const response = await fhirCdrClient.update({
      resourceType: 'Library',
      id: req.query['id'] as string,
      body: req.body,
    })

    res.send(response)
  } else if (req.method === 'POST ') {
    // update the program by id
    const response = await fhirCdrClient.update({
      resourceType: 'Library',
      id: req.query['id'] as string,
      body: req.body,
    })

    res.send(response)
  } 
}
