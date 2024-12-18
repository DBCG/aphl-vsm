import { addExtensionToVs, addProfileToValueSet, EXTENSIONS, transformFromVSACToCqf, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { terminologyClient } from 'fhirClients'
import FhirClient from '@/backend/clients/FhirClient'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import Logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'
import { cloneDeep } from 'lodash'
import { HandleVersionChange } from '@/components/ProgramValueSetDetails'
import retry from '@/helpers/retryRequest'
import { VSMSession } from '@/helpers/rolesHelper'
import { getServerSession } from 'next-auth'
import { tsCredentialService } from '@/backend/services/TsCredentialService'
import { AuthOptions } from '../auth/[...nextauth]'

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

    const matchInCqf = await FhirClient.getInstance().search({
      resourceType: 'ValueSet',
      searchParams: cqfSearchParams
    })

    if (matchInCqf?.entry?.length) {
      return true
    }
  } catch (e) {
    Logger.getLogger().error(`ERROR in getVsFromCQF: ${e}`)
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
  terminologyServerEndpoints: { label: string; value: { id: string; url: string } }[]
}
const addDetailsToLeaf = ({ vs, useContext, terminologyInfo, terminologyServerEndpoints }: AddDetails): fhir4.ValueSet => {
  const clonedVs = cloneDeep(vs)

  const conditionsToAdd = useContext?.filter(
    (ctxItem) => ctxItem?.code?.code === 'focus' && ctxItem?.code?.system?.toLowerCase()?.endsWith('usage-context-type')
  )

  if (conditionsToAdd) {
    const existingUseContext = clonedVs.useContext || []
    clonedVs.useContext = [...existingUseContext, ...conditionsToAdd]
  }

  const authSrcBase = terminologyServerEndpoints?.find((grp) => grp.value.id.toLowerCase() === terminologyInfo?.value?.toLowerCase())
    ?.value?.url as string

  
  let valueSetId = clonedVs?.id
    
    // VSAC adds -id to the end of ids, but we only want unversioned part
  // for both VSAC and UAT endpoints, only want unversioned ID to build auth source URL
  if (terminologyInfo?.url?.includes('cts.nlm.nih.gov')) {
    valueSetId = valueSetId?.split('-')[0]
  }

  const authSrcUrl = `${authSrcBase}/ValueSet/${valueSetId}`

  const vsWithAuthSrc = addExtensionToVs(clonedVs, EXTENSIONS.AUTH_SOURCE_EXTENSION_URL, authSrcUrl)
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
  useContext,
  creds
}: GetLeaf): Promise<fhir4.ValueSet | undefined> => {
  try {
    // return
    const matchingCreds = creds.find((cred) => cred.terminologyServerId === terminologyInfo.id)

    if (!matchingCreds) {
      Logger.getLogger().error(`Could not find credentials for terminology server ${terminologyInfo.value}`)
      return
    }

    terminologyClient.setCustomClient({
      clientName: terminologyInfo.value,
      baseUrl: terminologyInfo.url,
      basicAuthHeader: `${Buffer.from(`${matchingCreds.username}:${matchingCreds.password}`).toString('base64')}`
    })

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
      Logger.getLogger().info(`More than 1 match found for ${vsCanonical} with version ${versionToFind}`)
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
      Logger.getLogger().error(`Could not find ValueSet with id ${matchingVs.id} in terminology server ${terminologyInfo.value}`)
    }

    const vsWithNormalizedUrl = transformFromVSACToCqf(fullMatch as fhir4.ValueSet)
    if (!vsWithNormalizedUrl) {
      Logger.getLogger().error('Error normalizing leaf valueset')
      return
    }

    const allEndpoints = await FhirClient.getInstance().search({
      resourceType: 'Endpoint'
    })

    const formattedEndpoints = allEndpoints?.entry?.map((e: any) => {
      return {
        label: e.resource?.name,
        value: {id: e.resource.id, url: e.resource.address}
      }
    })

    const vsWithMetadata = addDetailsToLeaf({ vs: vsWithNormalizedUrl, useContext, terminologyInfo, terminologyServerEndpoints: formattedEndpoints })
    if (!vsWithMetadata) {
      Logger.getLogger().error('Error adding conditions and auth source to leaf valueset')
    }

    return vsWithMetadata
  } catch (e) {
    Logger.getLogger().error(`ERROR: ${e}`)
    return
  }
}

// --------------------------------------------
// ----------------- ROUTES -------------------
// --------------------------------------------
// this endpoint needs to:
// update the grouper valueset canonicals to point to the right valueset version
// add + remove versions from canonicals
// update condition and priority on program
const updateLeafValueSetVersions = async (req: NextApiRequest, res: NextApiResponse<updateLeafResponse>): Promise<void> => {
  const body = await req.body as HandleVersionChange
  const { vsCanonical, selectedVersion, grouperIds, programId, terminologyInfo, useContext } = body
  // save that particular version valueSet to the HAPI server
  // we must place the conditions & authoritative source on the valueset

  // steps:
  // 1. get the existing latest valueset
  // 2. set the terminology server to the correct endpoint
  // 3. get the correct version vset from the terminology server
  // 4. merge use-context and extension info (authoritative src) with versioned vset
  try {
    const session = <VSMSession>await getServerSession(req, res, AuthOptions)
    const creds = await tsCredentialService.getAllCredentials(session.user.id)
    
    const versionedLeafExistsInCQF = await matchExistsInCQF({ vsCanonical, versionToFind: selectedVersion })
    if (!versionedLeafExistsInCQF) {
      const matchFromTermServer = await getLeafFromTermServer({ terminologyInfo, vsCanonical, versionToFind: selectedVersion, useContext, creds })
      if (!matchFromTermServer) {
        return res
          .status(404)
          .json({ message: `Could not find ValueSet with url ${vsCanonical} of version ${selectedVersion} in ${terminologyInfo.value}` })
      }

      const updatedMatchFromTermServer = addProfileToValueSet(matchFromTermServer)
      // save match to CQF to be used
      const result = await FhirClient.getInstance().create({
        resourceType: 'ValueSet',
        body: updatedMatchFromTermServer
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
      Logger.getLogger().warn(`ERROR: ${JSON.stringify(e)}`)
    } else {
      Logger.getLogger().error(`ERROR: ${JSON.stringify(e)}`)
      return res.status(400).json({
        message: `Unspecified error occurred updating ValueSet with url ${vsCanonical} of version ${selectedVersion} from ${terminologyInfo.value}`
      })
    }
  }

  try {
    const groupersToUpdate = await Promise.all(
      grouperIds.map(
        (id: string) =>
          FhirClient.getInstance().read({
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

    const program = (await FhirClient.getInstance().read({ resourceType: 'Library', id: programId })) as fhir4.Library
    program.relatedArtifact?.forEach((i) => {
      if (i?.resource?.split('|')?.[0] === vsCanonical) {
        i.resource = selectedVersion === 'latest' ? vsCanonical : `${vsCanonical}|${selectedVersion}`
      }
    })

    updatedGroupers.push({
      request: {
        method: 'PUT',
        url: `Library/${programId}`
      } as fhir4.BundleEntryRequest,
      // @ts-ignore
      resource: program 
    })

    await retry(() => FhirClient.getInstance().transaction({
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
    Logger.getLogger().error(`ERROR: ${JSON.stringify(e)}`)
    return res.status(400).json({ message: `Failed to update groupers for ValueSet ${vsCanonical}` })
  }
}

export default handler({
  PUT: {
    action: updateLeafValueSetVersions
  }
})
