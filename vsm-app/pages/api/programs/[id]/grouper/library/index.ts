// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClient } from 'fhirClients'
import { editComposeInclude } from '@/helpers/libraryHelpers'
import handler from '@/helpers/server/handler'
import { is } from '@/helpers/is'

interface EditingInfo {
  action: 'remove' | 'add'
  vsCanonical: string
  vsId: string
}

interface BodyInfo {
  libraryId: string
  editingInfo: EditingInfo
}

const updateGrouperLibrary = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = JSON.parse(req.body)

    const { libraryId, editingInfo }: BodyInfo = body

    const grouperLib = await fhirCdrClient.read({
      resourceType: 'Library',
      id: libraryId
    })

    if (is.library(grouperLib) && editingInfo.action === 'remove') {
      const updatedGrouperLib = editComposeInclude({
        grouperLib,
        relatedArtifact: {
          url: editingInfo.vsCanonical
        },
        action: 'remove'
      })

      // update the grouper library to delete the reference
      // to the grouper valueset
      const updated = await fhirCdrClient.update({
        resourceType: 'Library',
        id: updatedGrouperLib.id,
        body: updatedGrouperLib
      })

      // delete the actual grouper valueset
      // as these only exist in the context of the program
      const deleted = await fhirCdrClient.delete({
        resourceType: 'ValueSet',
        id: editingInfo.vsId
      })

      if (is.library(updated)) {
        // if deletion of the actual ValueSet failed, doesn't matter from FE perspective
        // because the connection is severed at the Library level, but still warn
        // as this will create orphaned ValueSets in the data
        if (!deleted?.ok) {
          console.error(`Failed to delete ValueSet ${editingInfo.vsId}`)
        }
        return res.status(200).send(updated)
      } else {
        console.error(`Failed to update grouper lib ${grouperLib.name}`)
        return res.status(400).send({ error: 'Update failed' })
      }
    }
  } catch (e) {
    console.error('error: ', e)
    res.status(400).send({ error: 'error' })
  }
}

export default handler({
  PUT: {
    action: updateGrouperLibrary,
    access: ['admin', 'editor']
  }
})
