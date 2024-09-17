import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import {
  changeLogDiffOperation,
} from '@/helpers/exportExcelHelper'


// Endpoint to generate the raw changelog data
const generateChangelog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  try {
    const { baseProgramId, targetProgramId } = req.body

    if (!baseProgramId?.trim() || !targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Must have both base and target program IDs for changelog' })
    }
    if (baseProgramId?.trim() === targetProgramId?.trim()) {
      return res.status(400).send({ error: 'Base and Target programs must not be the same' })
    }

    const changelogData = await changeLogDiffOperation(baseProgramId, targetProgramId)

    if (changelogData.resourceType !== 'Binary') {
      // return res.status(200).send(result)
      return res.status(400).send({ error: 'Failed to generate ChangeLog data' })
    } else {
      const data = atob(changelogData.data!)
      return res.status(200).send(data)
    }

  } catch (e) {
    console.error(e?.response?.data?.issue)
    console.error(e)
    return res.status(400).send({ error: 'Error generating ChangeLog data' })
  }
}

export default handler({
  POST: {
    action: generateChangelog
  }
})
