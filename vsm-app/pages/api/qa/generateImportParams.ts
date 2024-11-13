import handler from '@/helpers/server/handler'
import ersd from '@/helpers/server/templates/ersd-1.2.2.0.json'
import { generateImportBundle } from '@/helpers/server/generateImportBundle'
import { fhirCdrClient } from '@/fhirClients'
import { incrementSemver } from '@/utils'
import { NextApiRequest, NextApiResponse } from 'next/types'
import { is } from '@/helpers/is'

const findUnusedVersion = async (version: string) => {
  let versionToTry = version
  let unusedVsmVersion

  while (!unusedVsmVersion) {
    const matchingLib = await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        context: 'program',
        version: versionToTry
      }
    })

    if (matchingLib?.total === 0) {
      unusedVsmVersion = versionToTry
    } else {
      versionToTry = incrementSemver({
        valueToIncrement: versionToTry,
        incrementType: 'minor',
        fallbackValue: '1.0.0'
      })
    }
  }
  return unusedVsmVersion
}

const allowedStrings = [
  // qa endpoint
  'a88ebe212beb245098a829c6616a4850-1737523659.us-east-1.elb.amazonaws.com',
  // local
  'localhost'
]

// this should create a smaller eRSD bundle for QA purposes
// it will output the data in a format that can be used for $ersd-v2-import in postman
const createParamsBundleForQA = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | { error: string }>) => {
  // this endpoint should only be available on QA deployment
  if (!allowedStrings.some(s => process.env.FHIR_CDR_URL?.includes(s))) {
    return res.status(400).json({ error: 'Endpoint only available for QA deployment' })
  }

  try {
    const payload = req.body

    // option to truncate data to make it a bit smaller
    const { maxLeafsPerGrouper } = payload
    const bundleData = payload.bundleData || ersd
    // need to check the format for the input payload to make sure it's correct
    // if no payload passed in, just use the eRSD 1.2.2.0 bundle

    // all owned data elements should be updated in these fields:
    // ID
    // URL
    // POST urls
    // any references to them in other resources...
    const versionForUpdate = bundleData?.entry
      ?.find((entry: any) => entry?.resource?.resourceType === 'Library' && entry?.resource?.useContext
      ?.find((uc: any) => uc?.code?.code === 'specification-type' && uc?.valueCodeableConcept?.coding?.[0]?.code === 'program'))
      ?.resource?.version

    const versionToUse = await findUnusedVersion(versionForUpdate)
  
    const result = generateImportBundle({
      ersdBundle: bundleData,
      maxLeafsPerGrouper,
      versionToUse
    })

    if (is.errorItem(result)) {
      return res.status(400).json({ error: result.error })
    } else {
      return res.status(200).json(result as fhir4.Bundle)
    }

  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Creating smaller bundle failed' })
  }
}

export default handler({
  POST: { action: createParamsBundleForQA, access: ['admin'] },
})