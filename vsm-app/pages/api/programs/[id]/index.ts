import type { NextApiRequest, NextApiResponse } from 'next'
import Client from 'fhir-kit-client'
import { fhirCdrClient } from 'fhirClients'
import { is } from '@/helpers/is'
import handler from '@/helpers/server/handler'
import { fetchLeafValueSetsByGrouperCanonical } from '@/helpers/server/serverValueSetHelper'
import {
  getGrouperLibraryCanonical,
  getVSPriorityUsageContext,
  setVSPriorityUsageContext,
  USHealthVSPriority
} from '@/helpers/libraryHelpers'

// this only gets the program library
const retrieveProgramLibrary = async (req: NextApiRequest, res: NextApiResponse) => {
  if (is.string(req?.query?.id)) {
    try {
      const lib = await fhirCdrClient.read({
        resourceType: 'Library',
        id: req.query.id as string
      })

      res.status(200).send(lib)
    } catch (e: any) {
      console.error('error: ', e?.response?.data?.text)
      res.status(400).json({ error: 'Search for program by id failed.' })
    }
  } else {
    console.error('error: Invalid program ID')
    res.status(400).json({ error: 'Search for program by id failed.' })
  }
}

const createProgramLibrary = async (req: NextApiRequest, res: NextApiResponse) => {
  // update the program by id
  const response = await fhirCdrClient.update({
    resourceType: 'Library',
    id: req.query['id'] as string,
    body: req.body
  })
  res.send(response)
}

const updateProgramLibrary = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // if the user does not want to change the id of the FHIR Library
    // simply update the values in the existing resource
    if (req.body.status === 'active') {
      console.error('Cannot edit an active Program Library')
      res.status(405).send('Not allowed')
    }
    if (req.body.id === req.query['id']) {
      const grouperLibraryCanonical = getGrouperLibraryCanonical(req.body)
      if (grouperLibraryCanonical == null) {
        return res.status(400).json({ error: 'Grouper Library Canonical Not Found' })
      }
      const leafValueSets = await fetchLeafValueSetsByGrouperCanonical(grouperLibraryCanonical)

      const programConditionPriority = getVSPriorityUsageContext(req.body) // APHL-502 program sets priority for leaf valuesets
      const batchBundle = []
      if (programConditionPriority) {
        leafValueSets?.forEach((vs) => {
          const updatedVs = setVSPriorityUsageContext(vs, programConditionPriority as USHealthVSPriority)
          batchBundle.push({
            resource: updatedVs,
            request: {
              method: 'PUT',
              url: `/ValueSet/${updatedVs.id}`
            }
          })
        })
      }

      batchBundle.push({
        resource: req.body,
        request: {
          method: 'PUT',
          url: `/Library/${req.body.id}`
        }
      })

      // update the program by id

      await fhirCdrClient.batch({
        body: {
          resourceType: 'Bundle',
          type: 'batch',
          entry: batchBundle
        }
      })

      res.send(req.body) // UI is expecting the updated library as a response
    } else {
      // if the user wants to change the id of the Library (hence non-matching ids),
      // create a new Library with that name, then delete the original one
      const body = await JSON.parse(req.body)
      await fhirCdrClient
        .update({
          resourceType: 'Library',
          id: body.id as string,
          body: req.body
        })
        .then(async (newLibraryData) => {
          const { response: newLibraryResponse } = Client.httpFor(newLibraryData)
          // return response
          if (newLibraryResponse.ok) {
            await fhirCdrClient
              .delete({
                resourceType: 'Library',
                id: req.query['id'] as string
              })
              .then((data) => {
                const { response: deleteResponse } = Client.httpFor(data as any)
                if (deleteResponse.ok) {
                  res.send(newLibraryData)
                }
              })
          } else {
            console.error('failed to create new program')
          }
        })
    }
  } catch (e) {
    console.error('ERROR: ', e)
  }
}

export default handler({
  GET: { action: retrieveProgramLibrary },
  PUT: { action: updateProgramLibrary },
  POST: { action: createProgramLibrary }
})
