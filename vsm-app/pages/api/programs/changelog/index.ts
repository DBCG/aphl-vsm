import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import { fhirCdrClient } from '@/fhirClients'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

const generateChangelog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  console.log('before: ')
  try {
    console.log('here')
    const { baseProgramId, targetProgramId } = req.body
  
    console.log('baseProgramId: ', baseProgramId)
    console.log('baseProgramId: ', targetProgramId)
    if (!baseProgramId?.trim() || !targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Must have both base and target program IDs for changelog' })
    }
  
    const changelogPayload = {
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
    }
  
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
      console.log('response not ok')
      console.error(response)
      return res.status(400).send({ error: 'error with changelog'})
    }

  } catch (e) {
    console.error(e)
    console.error(e.response.data.issue)
    return res.status(400).send({ error: 'error with changelog 2'}) 
    // console.log('e here: ', e.response.data.issue)
  }
}

export default handler({
  POST: {
    action: generateChangelog,
    access: ['admin', 'editor']
  }
})
