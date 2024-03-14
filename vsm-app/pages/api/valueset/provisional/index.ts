import { fhirCdrClient } from '@/fhirClients'
import { updateGrouperLeafs } from '@/helpers/libraryHelpers'
import { CreateProvisionalVs, generateProvisionalVs } from '@/helpers/provisionalVsHelpers'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import type { NextApiRequest, NextApiResponse } from 'next'

interface Body extends CreateProvisionalVs {
  grouperIds: string[]
}

interface ReqInfo extends NextApiRequest {
  body: Body
}

const createProvisionalValueSet = async (req: ReqInfo, res: NextApiResponse) => {
  try {
    const {
      authorToUpdate,
      stewardToUpdate,
      titleToUpdate,
      codesBySystemToAdd,
      grouperIds,
    } = req.body

    if (!codesBySystemToAdd?.length || !titleToUpdate || !grouperIds?.length) {
      return res.status(400).json({ error: 'Invalid input. Endpoint requires the codes, title, and grouper IDs of the ValueSet being created.' })
    }

    // first, create the value set
    const provisionalLeaf = generateProvisionalVs({
      authorToUpdate,
      stewardToUpdate,
      titleToUpdate,
      codesBySystemToAdd
    })

    // get the associated groupers and update with the reference
    const grouperReqItems = grouperIds?.map((id: string) => ({
      request: {
        resourceType: 'ValueSet',
        method: 'GET',
        url: `/ValueSet/${id}`
      }
    }))
    
    const allGroupersRes = await fhirCdrClient.transaction({ body: {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: grouperReqItems
    }})

    if (!allGroupersRes.entry) {
      return res.status(500).json({ error: `Failed to find groupers with IDs ${grouperIds.join(', ')}` })
    }

    // if groupers are all found, update their references with provisionalVS urls
    const groupersToUpdate = allGroupersRes.entry.map((i: fhir4.BundleEntry) => i.resource)
    const provisionalLeafUrl = [provisionalLeaf?.url!]

    const updatedGroupers = groupersToUpdate.map((g: fhir4.ValueSet) => {
      return updateGrouperLeafs(g, provisionalLeafUrl, 'add').grouper
    })

    // next, send a fhir transaction to create the value set + update the groupers

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Creating Provisional Valueset failed' })
  }
}

interface GetBody {
  reference?: fhir4.CodeSystem['url']
}

interface ProvisionalReqGet  extends NextApiRequest {
  body: GetBody
}

const getProvisionalVs = async (req: ProvisionalReqGet, res: NextApiResponse) => {
  try {

    const {
      // reference will only exist if users searching for
      // a particular valueset system
      // https://build.fhir.org/valueset.html#:~:text=ValueSet.compose.include.system
      reference
    } = req.body

   let searchParams = {
    _tag: 'vsm-authored'
  }

    // ideally I wouldn't be doing this and would just be using a searchParam on
    // an extension that designates provisional?
    const allVsmOwnedVS = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams
    })

    const results = allVsmOwnedVS?.entry?.map((e: any) => e?.resource) || [] as fhir4.ValueSet[]
    const provisionalLeafsOnly = results?.filter(r => r.extension.find(e => e.url.includes('vsm-test-extension')))

    return res.status(200).json(provisionalLeafsOnly || [])

  } catch (e) {
    logger.error(e)
    res.status(400).json({ error: 'Search for Provisional Value Sets Failed' })
  }
}

export default handler({
  POST: { action: createProvisionalValueSet, access: ['admin', 'editor'] },
  GET: { action: getProvisionalVs, access: ['admin', 'editor'] },
})