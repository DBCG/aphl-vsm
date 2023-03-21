// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import { addExtensionToVs, addValueSetToGrouper, authoritativeSourceExtensionUrl, createGrouperWithMetadata, removeValueSetFromGrouper, stringWithoutVersion } from '@/helpers/valueSetHelpers'
import handler from '@/helpers/server/handler'
import { HapiError } from '@/types/hapiError'
import { FlatGrouperVSet, GrouperMetadata } from '@/types/grouperTypes'
import { updateConditions } from '@/helpers/conditionHelpers'
import { terminologyServerEndpoints } from 'fhirClientOptions'

const buildBatchVSPut = (vsets: fhir4.ValueSet[]): fhir4.BundleEntry[] => {
  return vsets.map(vs => ({
    resource: vs,
    request: {
      method: 'PUT',
      url: `ValueSet/${vs.id}`
    }
  }))
}

const updateGroupers = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = JSON.parse(req.body)
    const { vsCanonical, grouperCanonicals } = body

    const groupersToUpdate = []
    for (const grouperC of grouperCanonicals) {
      const grouperValueSetBundle = (await fhirCdrClient.search({
        resourceType: 'ValueSet',
        searchParams: {
          url: grouperC
        }
      })) as fhir4.Bundle

      // there is an issue in the sample data where grouper valuesets have the exact same url
      const grouperVsToUpdate = grouperValueSetBundle?.entry?.[0]?.resource as fhir4.ValueSet

      if (grouperVsToUpdate) {
        const updatedGrouper = removeValueSetFromGrouper(grouperVsToUpdate, vsCanonical)

        groupersToUpdate.push(updatedGrouper)
        const result = await Promise.all(
          groupersToUpdate.map((grouperVs) =>
            fhirCdrClient.update({
              resourceType: 'ValueSet',
              id: grouperVs.id,
              body: grouperVs
            })
          )
        )
      }
    }
    return res.status(200).send(groupersToUpdate)
  } catch (e) {
    console.error('error: ', e)
    res.status(400).send({ error: 'error' })
  }
}

interface BodyInfo {
  grouperVSets: FlatGrouperVSet[]
  grouperMetadata: GrouperMetadata
}

// POST a grouper that has never existed before
const createGrouperValueSet = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
  const body: BodyInfo = JSON.parse(req.body)
  const { id: programId } = req.query // this will always be a string

  const {
    grouperVSets,
    grouperMetadata
  } = body

  let program

  try {
    program = await fhirCdrClient.read({
      resourceType: 'Library',
      id: programId
    })

    if (program.status !== 'draft') {
      return res.status(405).send({ error: 'Only programs with draft status may be edited' })
    }
  } catch (e) {
    return res.status(404).send({ error: `Program with id ${programId} not found.` })
  }

  // check to make sure no vset exists with user-entered ID
  try {
    const existingVS = await fhirCdrClient.read({
      resourceType: 'ValueSet',
      id: grouperMetadata.id!
    })

    // if vs with id already exists, error out
    if (existingVS) {
      return res.status(409).send({ error: `ValueSet with ID ${grouperMetadata.id} already exists. Please enter a unique ID.` })
    }
  } catch (e: HapiError | any) {
    // handle any error that is not a 404
    if (e?.response?.status !== 404) {
      return res.status(409).send({ error: `Server error occurred while checking existence of ValueSet with ID ${grouperMetadata.id}.` })
    }
  }
  // TODO -- make sure these are from the right terminology server
  // get all matching leaf VSets that exist in our CDR
  const entries: fhir4.BundleEntry[] = grouperVSets.map(vs => {
    const unversionedUrl = stringWithoutVersion(vs.selectedValueSet.url!)
    return ({
      request: {
        method: 'GET',
        url: `ValueSet?url=${unversionedUrl}&_sort=-version`
      }
    })
  })

  let matchesInCqf: fhir4.ValueSet[] | undefined
  // keep track of urls added to be able to pin to grouper after leafs saved to CQF
  let allUrlsAdded: fhir4.ValueSet['url'][] = []

  try {
    const getRequestBundle: fhir4.Bundle & { type: 'batch' } = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: entries
    }

    const responsesFromCdrGet = await fhirCdrClient.batch({
      body: getRequestBundle
    })
    // only get the first resource in each nested array, should be ordered by version
    // so first is most recent
    matchesInCqf = responsesFromCdrGet.entry
      .map(i => i?.resource?.entry?.[0]?.resource)?.filter(x => Boolean(x))

    if (matchesInCqf) {
      // handle this!
    }
    // update existing valuesets with any conditions added
    const updatedValueSetsFromCache = matchesInCqf.map(cachedVS => {

      const conditionsToAdd = grouperVSets
        .find(item => stringWithoutVersion(item.selectedValueSet.url!) === cachedVS.url)
        ?.selectedConditions
        ?.filter(x => Boolean(x))
      // if user does not include conditions, just return unchanged vs
      if (!conditionsToAdd?.length) {
        return cachedVS
      }
      const vsWithConditions = updateConditions(cachedVS, conditionsToAdd, false)
      return vsWithConditions
    })

    const batchEntries = buildBatchVSPut(updatedValueSetsFromCache)

    const putRequestBundle: fhir4.Bundle & { type: 'batch' } = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: batchEntries
    }

    const responsesFromCdrPut = await fhirCdrClient.batch({
      body: putRequestBundle
    })

    // match everything until the 2nd slash for error readout
    const regex = new RegExp('^[^/]+/[^/]+')

    const failedPuts = responsesFromCdrPut.entry
      ?.filter(res => res.response.status !== '200 OK')
      ?.map(failure => failure.response.location.match(regex))

    // fail out if there  was an error in one of the PUTs
    if (failedPuts?.length) {
      return res.status(400).send({ error: `Could not update ValueSets: ${failedPuts.join(', ')}` })
    } else {
      // if no failures, track all urls of added leafs
      allUrlsAdded = matchesInCqf.map(vs => vs.url)
    }

    // at this point, all valuesets existing in the CDR should be
    // updated with the proper conditions added, or error out

  } catch (e) {
    return res.status(400).send({ error: 'Could not update ValueSets with new conditions' })
  }

  // now that all vsets existing in CQF server have been updated
  // update those that are not in our cache yet

  let vsUrlsInCqf = matchesInCqf?.map(v => stringWithoutVersion(v.url!))

  // find all the valuesets that are not already in CQF for updating
  const vsToAddFromTermServer = grouperVSets?.filter(vs => {
    return !vsUrlsInCqf?.includes(stringWithoutVersion(vs.selectedValueSet.url!))
  })

  // each valueset could technically be from a different terminology server
  if (vsToAddFromTermServer) {
    for (const flatGrouperItem of vsToAddFromTermServer) {
      try {
        terminologyClient.setClient(flatGrouperItem.selectedTerminologyServer)
        const terminologyClientInstance = terminologyClient.getClient()
        // vsac appends version to the id, search by unversioned
        // must do a read operation to get whole valueset instead of subsetted
        const idWithoutVersion = stringWithoutVersion(flatGrouperItem.selectedValueSet.id!)
        const valueSetToAdd = await terminologyClientInstance.read({
          resourceType: 'ValueSet',
          id: idWithoutVersion
        })

        // add optional conditions to valueset from term server (VSAC)
        const vsWithConditions = updateConditions(valueSetToAdd, flatGrouperItem.selectedConditions, false)

        // add authoritativeSource to valueset
        // TODO should make this a helper now used in 2 files
        const authSrcUrl = terminologyServerEndpoints
          ?.find(grp => grp.value.title.toLowerCase() === flatGrouperItem.selectedTerminologyServer.toLowerCase())
          ?.value?.url

        const vsWithAuthSource = addExtensionToVs(vsWithConditions, authoritativeSourceExtensionUrl, authSrcUrl)

        const vsAddedToCache = await fhirCdrClient.create({
          resourceType: 'ValueSet',
          body: vsWithAuthSource
        })

        if (vsAddedToCache) {
          allUrlsAdded.push(vsWithAuthSource.url)
        } else {
          return res.status(400).send({ error: `Error saving ValueSet: '${flatGrouperItem.selectedValueSet.name}'` })
        }

      } catch (e) {
        console.error('e: ', e)
        return res.status(400).send({ error: `Error saving ValueSet '${flatGrouperItem.selectedValueSet.name}' from terminology server ${flatGrouperItem.selectedTerminologyServer}` })
      }
    }
  }

  // if reaches here, all leaf valuesets have been added to CQF
  // next, create the grouper valueset and add the references to the leaf urls
  const newGrouper = createGrouperWithMetadata(grouperMetadata)

  const grouperWithLeafRefs = addValueSetToGrouper(newGrouper, allUrlsAdded)

  // save the grouper valueSet to CQF
  // use PUT instead of POST so we can define the id of grouper per the form input
  let grouperReference
  try {
    const createdGrouper = await fhirCdrClient.update({
      resourceType: 'ValueSet',
      id: grouperMetadata.id,
      body: grouperWithLeafRefs
    })

    // add versioned grouper reference if successful
    grouperReference = `${createdGrouper.url}|${createdGrouper.version}`

  } catch (e) {
    return res.status(400).send({ error: `Error saving Grouper ${grouperMetadata.id}` })
  }

  // finally, add the reference to this new grouper valueset to the VS Library
  // first, get the VS library associated with this program
  // is there a more streamlined way to do this in one query? need url and version
  try {

    // only one relatedArtifact will be the vs library
    // this must always exist
    const vsLibUrlToUpdate: string = program.relatedArtifact.find(artifact => {
      return artifact.type === 'composed-of' && artifact.resource.includes('/Library/')
    }).resource

    // there is currently no version on the grouper library after clone...
    // how do we identify which is the right one if this is the case?
    const [url, version] = vsLibUrlToUpdate.split('|')

    // currently there will only be ONE vs library with this url with draft status
    // this will be changed in the future with updates to how CQF $draft works
    // for now have to use this uniqueness to target the right library, will need to update
    const vsLib: fhir4.Bundle & { type: 'searchset' } = await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        url,
        version,
        status: 'draft'
      }
    })

    // there will only be one result because only one draft allowed currently
    const libResource = vsLib.entry[0].resource as fhir4.Library

    libResource.relatedArtifact.push({
      type: 'composed-of',
      resource: grouperReference.split('|')[0] // should this be verisoned or unversioned
    })

    // at this point, the grouper's valueset library is updated, save & return 200 if success
    await fhirCdrClient.update({
      resourceType: 'Library',
      id: libResource.id,
      body: libResource
    })

    return res.status(200).send({ message: `Saved new grouper to Program ${programId}` })


  } catch (e) {
    return res.status(400).send({ error: `Failed to save changes to Program ${programId}` })
  }
}



export default handler({
  PUT: {
    action: updateGroupers,
    access: ['admin', 'editor']
  },
  POST: {
    action: createGrouperValueSet,
    access: ['admin', 'editor']
  }
})
