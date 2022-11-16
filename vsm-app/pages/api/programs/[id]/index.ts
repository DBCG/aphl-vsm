// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import Client from 'fhir-kit-client'
import { fhirCdrClient } from 'fhirClients'

// this only gets the program library
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

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
      res.status(200).send(lib)

    } catch (e: any) {
      console.error('error:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for program by id failed.' })
    }
  } else if (req.method === 'PUT') {
    try {
      // if the user does not want to change the id of the FHIR Library
      // simply update the values in the existing resource
      if (req.body.status === 'active') {
        console.error('Cannot edit an active Program Library')
        res.status(405).send('Not allowed')
      }
      if (req.body.id === req.query['id']) {
        // update the program by id
        const response = await fhirCdrClient.update({
          resourceType: 'Library',
          id: req.query['id'] as string,
          body: req.body,
        })
        res.send(response)
      } else {
        // if the user wants to change the id of the Library (hence non-matching ids),
        // create a new Library with that name, then delete the original one
        const body = await JSON.parse(req.body)
        await fhirCdrClient.update({
          resourceType: 'Library',
          id: body.id as string,
          body: req.body,
        }).then(async (newLibraryData) => {
          const { response: newLibraryResponse } = Client.httpFor(newLibraryData)
          // return response
          if (newLibraryResponse.ok) {
            await fhirCdrClient.delete({
              resourceType: 'Library',
              id: req.query['id'] as string
            }).then((data) => {
              const { response: deleteResponse } = Client.httpFor(data as any)
              if (deleteResponse.ok) {
                res.send(newLibraryData)
              }
            })
          } else {
            console.error('failed to create new program');
          }
        })
      }

    } catch (e) {
      console.error('ERROR: ', e)
    }

  } else if (req.method === 'POST') {
    // update the program by id
    const response = await fhirCdrClient.update({
      resourceType: 'Library',
      id: req.query['id'] as string,
      body: req.body,
    })

    res.send(response)
  }
}
