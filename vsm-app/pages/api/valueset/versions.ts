import { addExtensionToVs, authoritativeSourceExtensionUrl, transformFromVSACToCqf, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import cloneDeep from 'lodash.clonedeep'
import { terminologyServerEndpoints } from '@/fhirClientOptions'

// --------------------------------------------
// ------------ HELPER FUNCTIONS --------------
// --------------------------------------------

interface MatchExists {
  vsCanonical: string
  versionToFind: string
}

const matchExistsInCQF = async ({ vsCanonical, versionToFind }:MatchExists): Promise<boolean> => {
  try {
    const cqfSearchParams = {
      url: vsCanonical,
      _sort: 'version'
    }
  
    if(versionToFind !== 'latest') {
      // @ts-ignore
      cqfSearchParams.version = versionToFind
    }
  
    const matchInCqf = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: cqfSearchParams
    })

    if (matchInCqf?.entry?.length) {
      return true
    }
  } catch(e) {
    logger.error(`ERROR in getVsFromCQF: ${e}`)
  }
  return false
}
interface TermInfo {
  value: string
  hasExtension: boolean
}

interface AddDetails {
  vs: fhir4.ValueSet
  useContext: fhir4.UsageContext[]
  terminologyInfo: TermInfo
}
const addDetailsToLeaf = ({vs, useContext, terminologyInfo}: AddDetails): fhir4.ValueSet => {
  console.log('terminologyInfo: ', terminologyInfo)
  const clonedVs = cloneDeep(vs)

  const conditionsToAdd = useContext?.filter(ctxItem => ctxItem?.code?.code === 'focus' && ctxItem?.code?.system?.toLowerCase()?.endsWith('usage-context-type'))

  if (conditionsToAdd) {
    const existingUseContext = clonedVs.useContext || []
    clonedVs.useContext = [...existingUseContext, ...conditionsToAdd]
  }

  const authSrcUrl = terminologyServerEndpoints?.find(
    (grp) => grp.value.title.toLowerCase() === terminologyInfo?.value?.toLowerCase()
  )?.value?.url as string

  const vsWithAuthSrc = addExtensionToVs(clonedVs, authoritativeSourceExtensionUrl, authSrcUrl)
  return vsWithAuthSrc
}

interface GetLeaf {
  terminologyInfo: TermInfo
  vsCanonical: string
  versionToFind: string
  useContext: fhir4.UsageContext[]
}

const getLeafFromTermServer = async ({ terminologyInfo, vsCanonical, versionToFind, useContext }: GetLeaf): Promise<fhir4.ValueSet | undefined> => {
  try {
    // @ts-ignore
    terminologyClient.setClient(terminologyInfo.value.toLowerCase())
    const terminologyClientInstance = terminologyClient.getClient()!
  
    const searchParams = {
      url: vsCanonical,
      _sort: 'version',
      // if a specific version is set and is NOT equal to the current version
      // set that version in the searchParameters
      ...(versionToFind !== 'latest' && { version: versionToFind })
    }
  
    const latestOrVersionedVsets = await terminologyClientInstance.search({
      resourceType: 'ValueSet',
      searchParams
    }).then((res) => {
      if (is.bundle(res)) {
        res.entry = res?.entry?.map((i: fhir4.BundleEntry) => {
          // this is an unfortunate thing to have to do
          const resource = transformFromVSACToCqf(i.resource as fhir4.ValueSet, i.fullUrl as string)
          return {
            ...i,
            resource
          }
        })
      }
      return res
    })
  
    if(latestOrVersionedVsets?.entry?.length > 1) {
      logger.info(`More than 1 match found for ${vsCanonical} with version ${versionToFind}`)
    }
  
    const matchingVs = latestOrVersionedVsets?.entry?.[0]?.resource
  
    if(!matchingVs) return
  
    // the search above will return a subsetted resource from VSAC, which is not what we want
    // have to perform a read operation to get the whole thing
    const fullMatch = await terminologyClientInstance.read({
      resourceType: 'ValueSet',
      id: matchingVs.id
    })

    if(!is.valueSet(fullMatch)) {
      logger.error(`Could not find ValueSet with id ${matchingVs.id} in terminology server ${terminologyInfo.value}`)
    }

    const vsWithNormalizedUrl = transformFromVSACToCqf(fullMatch as fhir4.ValueSet)
    if(!vsWithNormalizedUrl) {
      logger.error('Error normalizing leaf valueset')
      return
    }
    const vsWithMetadata = addDetailsToLeaf({ vs: vsWithNormalizedUrl, useContext, terminologyInfo })
    if(!vsWithMetadata) {
      logger.error('Error adding conditions and auth source to leaf valueset')
    }

    return vsWithMetadata
    
  } catch (e) {
    logger.error(`ERROR: ${e}`)
    return
  }
}

// --------------------------------------------
// ----------------- ROUTES -------------------
// --------------------------------------------
// this endpoint needs to:
// update the grouper valueset canonicals to point to the right valueset version
// add + remove versions from canonicals
const updateLeafValueSetVersions = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const body = await req.body
  const bodyJson = JSON.parse(body)
  const { vsCanonical, vsVersion, grouperIds, terminologyInfo, useContext } = bodyJson
  // save that particular version valueSet to the HAPI server
  // we must place the conditions & authoritative source on the valueset

  // steps:
  // 1. get the existing latest valueset
  // 2. set the terminology server to the correct endpoint
  // 3. get the correct version vset from the terminology server
  // 4. merge use-context and extension info (authoritative src) with versioned vset

  try {
    const versionedLeafExistsInCQF = await matchExistsInCQF({ vsCanonical, versionToFind: vsVersion})
    if(!versionedLeafExistsInCQF) {
      const matchFromTermServer = await getLeafFromTermServer({terminologyInfo, vsCanonical, versionToFind: vsVersion, useContext})
      if(!matchFromTermServer) {
        return res.status(404).json({ message: `Could not find ValueSet with url ${vsCanonical} of version ${vsVersion} in ${terminologyInfo.value}`}) 
      }

      // save match to CQF to be used
      const result = await fhirCdrClient.create({
        resourceType: 'ValueSet',
        body: matchFromTermServer
      })

      if(!is.valueSet(result)) {
        return res.status(400).json({ message: `Error occurred updating ValueSet with url ${vsCanonical} of version ${vsVersion} from ${terminologyInfo.value}`})  
      }
    }
  } catch (e) {
    logger.error(`ERROR: ${e}`)
    return res.status(400).json({ message: `Unspecified error occurred updating ValueSet with url ${vsCanonical} of version ${vsVersion} from ${terminologyInfo.value}`}) 
  }

  try {
    const groupersToUpdate = await Promise.all(
      grouperIds.map((id: string) => (
        fhirCdrClient.read({
          resourceType: 'ValueSet',
          id
        })
        )
      ))

    const updatedGroupers = groupersToUpdate?.map((grouperVs: fhir4.ValueSet) => updateLeafVsVersion(grouperVs, vsCanonical, vsVersion))
  
    await Promise.all(
      updatedGroupers.map((grouperVs: fhir4.ValueSet) =>
        fhirCdrClient.update({
          resourceType: 'ValueSet',
          id: grouperVs.id,
          body: grouperVs
        })
      )
    )
  
    return res.status(200).json({ message: 'Update valueset versions completed', grouperIds, vsCanonical })
  } catch (e) {
    return res.status(400).json({ message: `Failed to update groupers for ValueSet ${vsCanonical}` }) 
  }
}

export default handler({
  PUT: {
    action: updateLeafValueSetVersions
  }
})
