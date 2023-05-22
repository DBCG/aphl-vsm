import { transformFromVSACToCqf, updateLeafVsVersion } from '@/helpers/valueSetHelpers'
import { fhirCdrClient, terminologyClient } from 'fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import logger from '@/helpers/server/logger'
import { is } from '@/helpers/is'

// this endpoint needs to:
// update the grouper valueset canonicals to point to the right valueset version
// add + remove versions from canonicals
const updateLeafValueSetVersions = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const body = await req.body
  const bodyJson = JSON.parse(body)
  const { vsCanonical, vsVersion, grouperIds, terminologyInfo, selectedVsId } = bodyJson
  // save that particular version valueSet to the HAPI server
  // we must place the conditions & authoritative source on the valueset

  // steps:
  // 1. get the existing latest valueset
  // 2. set the terminology server to the correct endpoint
  // 3. get the correct version vset from the terminology server
  // 4. merge use-context and extension info (authoritative src) with versioned vset

  try {

    const cqfSearchParams = {
      url: vsCanonical
    }

    if(vsVersion !== 'latest') {
      cqfSearchParams.version = vsVersion
    }

    const matchInCqf = fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: cqfSearchParams
    })

    if(matchInCqf?.entry?.length) {
      // TODO: if there's a match in cqf, skip all the valueset getting stuff
      // should refactor this route so getting the valueset and setting the grouper refs
      // are their own functions 
    }
    // first, get the valueset that you are updating precisely by id
    // doing this to get extensions + usecontext to add to valueset later
    const selectedVs = await fhirCdrClient.read({
      resourceType: 'ValueSet',
      id: selectedVsId
    })

    console.log('selected VS: ', selectedVs)

    const latestValueSetBundle = await fhirCdrClient.search({
      resourceType: 'ValueSet',
      searchParams: {
        url: vsCanonical,
        _sort: 'version',
        _count: 1
      }
    })

    if (!latestValueSetBundle?.entry) {
      // there was no result, return
      logger.error('no entry')
      return res.status(404).json({ message: `Could not find ValueSet with url ${vsCanonical}` })
    } else {
      terminologyClient.setClient(terminologyInfo.value.toLowerCase())

      const searchParams = {
        url: vsCanonical,
        // if a specific version is set and is NOT equal to the current version
        // set that version in the searchParameters
        ...(vsVersion !== 'latest' && { version: vsVersion })
      }
      // TODO: else
      // just get the latest one, sort + count = 1
      // if version matches on both, don't do the search etc

      const terminologyClientInstance = terminologyClient.getClient()!

      const latestOrVersionedVset = await terminologyClientInstance.search({
        resourceType: 'ValueSet',
        searchParams
      }).then((res) => {
        if (is.bundle(res)) {
          res.entry = res?.entry?.map((i: fhir4.BundleEntry) => {
            const resource = transformFromVSACToCqf(i.resource as fhir4.ValueSet, i.fullUrl as string)
            return {
              ...i,
              resource
            }
          })
        }
        return res
      })

      const bundleEntry = latestOrVersionedVset?.entry

      if (!bundleEntry) {
        // return, resource doesn't exist
      } else if (bundleEntry.length > 1) {
        // this is necessary because VSAC isn't respecting version searchParam
        let matchingItem = bundleEntry?.filter((e: fhir4.BundleEntry) => {
          const vs = e?.resource as fhir4.ValueSet
          return vs.version === vsVersion
        })?.[0]?.resource

        const isSubsetted = Boolean(matchingItem?.meta?.tag?.find((t) => t?.code?.toUpperCase() === 'SUBSETTED'))
        if (isSubsetted) {
          console.log('subsetted')
          // need to get the whole valueset, not just subset
          const wholeVs = await terminologyClientInstance.read({
            resourceType: 'ValueSet',
            id: matchingItem.id
          }).then((vs) => {
            if (is.valueSet(vs)) {
              const resource = transformFromVSACToCqf(vs, vs.url as string)
              return resource
            }
            console.error('not a valueset')
          })

          if(is.valueSet(wholeVs)) {
            // add conditions, authoritative source
            // for now just copy over useContext and extensions to test
            wholeVs.useContext = selectedVs.useContext
            wholeVs.extension = selectedVs.extension

            const newV = await fhirCdrClient.create({
              resourceType: 'ValueSet',
              body: wholeVs
            })
          }
        }
      }
    }
  } catch (e) {
    logger.error('error: ', e)
  }
  // return
  const groupersToUpdate = await Promise.all(
    grouperIds.map((id: string) =>
      fhirCdrClient.read({
        resourceType: 'ValueSet',
        id
      })
    )
  )

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

  res.status(200).json({ message: 'Update valueset versions completed', grouperIds, vsCanonical })
}

export default handler({
  PUT: {
    action: updateLeafValueSetVersions
  }
})
