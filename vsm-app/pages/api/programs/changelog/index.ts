import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from '@/fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'
import { addTerminologyEndpointToParameters } from '../[id]/package'

const generateChangelog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  try {
    const { baseProgramId, targetProgramId } = req.body

    if (!baseProgramId?.trim() || !targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Must have both base and target program IDs for changelog' })
    }

    const changelogPayload = addTerminologyEndpointToParameters({
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'source',
          valueString: `Library/${baseProgramId}`
        },
        {
          name: 'target',
          valueString: `Library/${targetProgramId}`
        },
        {
          name: 'compareComputable',
          valueBoolean: true
        },
        {
          name: 'compareExecutable',
          valueBoolean: true
        }
      ]
    })

    const response = await fhirCdrClient.operation({
      name: '$create-changelog',
      method: 'POST',
      options: {
        headers: {
          'Content-Type': `application/fhir+json`,
          ...fhirCdrClient.customHeaders
        }
      },
      input: changelogPayload
    })

    if (response.resourceType === 'Binary') {
      const result = atob(response.data!)
      return res.status(200).send(result)
    } else {
      console.error(response)
      return res.status(400).send({ error: 'error with changelog' })
    }

  } catch (e) {
    console.error(e)
    return res.status(400).send({ error: 'error with changelog 2' })
  }
}

export default handler({
  POST: {
    action: generateChangelog,
    access: ['admin', 'editor']
  }
})
