import { addExtensionToVs, authoritativeSourceExtensionUrl, transformFromVSACToCqf, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import cloneDeep from 'lodash.clonedeep'
import { terminologyServerEndpoints } from '@/fhirClientOptions'
import { HandleVersionChange } from '@/components/ProgramValueSetDetails'
import retry from '@/helpers/retryRequest'

// --------------------------------------------
// ------------ HELPER FUNCTIONS --------------
// --------------------------------------------

interface MatchExists {
  vsCanonical: string
  versionToFind: string
}
export interface updateLeafResponse {
  message: string
  grouperIds?: String[]
  vsCanonical?: string
}

const matchExistsInCQF = async ({ vsCanonical, versionToFind }: MatchExists): Promise<boolean> => {
  try {
    const cqfSearchParams: { url: string; _sort: string; version?: string } = {
      url: vsCanonical,
      _sort: 'version'
    }

    if (versionToFind !== 'latest') {
      cqfSearchParams.version = versionToFind
    }

    const matchInCqf = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: cqfSearchParams
    })

    if (matchInCqf?.entry?.length) {
      return true
    }
  } catch (e) {
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
const addDetailsToLeaf = ({ vs, useContext, terminologyInfo }: AddDetails): fhir4.ValueSet => {
  const clonedVs = cloneDeep(vs)

  const conditionsToAdd = useContext?.filter(
    (ctxItem) => ctxItem?.code?.code === 'focus' && ctxItem?.code?.system?.toLowerCase()?.endsWith('usage-context-type')
  )

  if (conditionsToAdd) {
    const existingUseContext = clonedVs.useContext || []
    clonedVs.useContext = [...existingUseContext, ...conditionsToAdd]
  }

  const authSrcUrl = terminologyServerEndpoints?.find((grp) => grp.value.title.toLowerCase() === terminologyInfo?.value?.toLowerCase())
    ?.value?.url as string

  const vsWithAuthSrc = addExtensionToVs(clonedVs, authoritativeSourceExtensionUrl, authSrcUrl)
  return vsWithAuthSrc
}

interface GetLeaf {
  terminologyInfo: TermInfo
  vsCanonical: string
  versionToFind: string
  useContext: fhir4.UsageContext[]
}

const getLeafFromTermServer = async ({
  terminologyInfo,
  vsCanonical,
  versionToFind,
  useContext
}: GetLeaf): Promise<fhir4.ValueSet | undefined> => {
  try {
    const client = terminologyInfo.value.toLowerCase()
    if (!(client === 'vsac' || client === 'ontoserverR4')) {
      throw "Invalid terminology server"
    }
    terminologyClient.setClient(client)
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
    })

    if (latestOrVersionedVsets?.entry?.length > 1) {
      logger.info(`More than 1 match found for ${vsCanonical} with version ${versionToFind}`)
    }

    const matchingVs = latestOrVersionedVsets?.entry?.find(
      (e: fhir4.BundleEntry) => (e?.resource as fhir4.ValueSet)?.version === versionToFind
    )?.resource

    if (!matchingVs) return

    // the search above will return a subsetted resource from VSAC, which is not what we want
    // have to perform a read operation to get the whole thing
    const fullMatch = await terminologyClientInstance.read({
      resourceType: 'ValueSet',
      id: matchingVs.id
    })

    if (!is.valueSet(fullMatch)) {
      logger.error(`Could not find ValueSet with id ${matchingVs.id} in terminology server ${terminologyInfo.value}`)
    }

    const vsWithNormalizedUrl = transformFromVSACToCqf(fullMatch as fhir4.ValueSet)
    if (!vsWithNormalizedUrl) {
      logger.error('Error normalizing leaf valueset')
      return
    }
    const vsWithMetadata = addDetailsToLeaf({ vs: vsWithNormalizedUrl, useContext, terminologyInfo })
    if (!vsWithMetadata) {
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
const updateLeafValueSetVersions = async (req: NextApiRequest, res: NextApiResponse<updateLeafResponse>): Promise<void> => {
  const body = await req.body
  const bodyJson = JSON.parse(body) as HandleVersionChange
  const { vsCanonical, selectedVersion, grouperIds, terminologyInfo, useContext } = bodyJson
  // save that particular version valueSet to the HAPI server
  // we must place the conditions & authoritative source on the valueset

  // steps:
  // 1. get the existing latest valueset
  // 2. set the terminology server to the correct endpoint
  // 3. get the correct version vset from the terminology server
  // 4. merge use-context and extension info (authoritative src) with versioned vset

  try {
    const versionedLeafExistsInCQF = await matchExistsInCQF({ vsCanonical, versionToFind: selectedVersion })
    if (!versionedLeafExistsInCQF) {
      const matchFromTermServer = await getLeafFromTermServer({ terminologyInfo, vsCanonical, versionToFind: selectedVersion, useContext })
      if (!matchFromTermServer) {
        return res
          .status(404)
          .json({ message: `Could not find ValueSet with url ${vsCanonical} of version ${selectedVersion} in ${terminologyInfo.value}` })
      }

      // save match to CQF to be used
      const result = await fhirCdrClient.create({
        resourceType: 'ValueSet',
        body: matchFromTermServer
      })

      if (!is.valueSet(result)) {
        return res.status(400).json({
          message: `Error occurred updating ValueSet with url ${vsCanonical} of version ${selectedVersion} from ${terminologyInfo.value}`
        })
      }
    }
  } catch (e: any) {
    const maybeHapiError = e?.response?.data
    // Sometimes the server lags behind and has not yet indexed the search for a created valueset
    // This is a fix to prevent the server from throwing an error when it tries to create a valueset that already exists
    if (is.operationOutcome(maybeHapiError) && maybeHapiError?.issue?.[0]?.diagnostics?.includes('already have one with resource ID:')) {
      logger.warn(`ERROR: ${JSON.stringify(e)}`)
    } else {
      logger.error(`ERROR: ${JSON.stringify(e)}`)
      return res.status(400).json({
        message: `Unspecified error occurred updating ValueSet with url ${vsCanonical} of version ${selectedVersion} from ${terminologyInfo.value}`
      })
    }
  }

  try {
    const groupersToUpdate = await Promise.all(
      grouperIds.map(
        (id: string) =>
          fhirCdrClient.read({
            resourceType: 'ValueSet',
            id
          }) as Promise<fhir4.ValueSet>
      )
    )

    const updatedGroupers = groupersToUpdate
      ?.map((grouperVs: fhir4.ValueSet) => updateLeafVsVersion(grouperVs, vsCanonical, selectedVersion))
      .map((grouper) => ({
        request: {
          method: 'PUT',
          url: `ValueSet/${grouper.id}`
        } as fhir4.BundleEntryRequest,
        resource: grouper as fhir4.ValueSet
      }))

    await retry(
      // @ts-ignore
      fhirCdrClient.transaction({
        body: {
          resourceType: 'Bundle',
          type: 'transaction',
          entry: updatedGroupers
        }
      }),
      3,
      2000
    )

    return res.status(200).json({ message: 'Update valueset versions completed', grouperIds, vsCanonical })
  } catch (e) {
    logger.error(`ERROR: ${JSON.stringify(e)}`)
    return res.status(400).json({ message: `Failed to update groupers for ValueSet ${vsCanonical}` })
  }
}

export default handler({
  PUT: {
    action: updateLeafValueSetVersions
  }
})
