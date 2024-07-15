import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import ExcelJS from 'exceljs'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
import { getGrouperLibrary } from './details/valuesets'
import {
  changeLogDiffOperation,
  generateReadMeSheet,
  generatePlanDefSheet,
  generateRCTCSheet,
  generateGrouperValuesetSheet
} from '@/helpers/exportExcelHelper'

const downloadChangeLog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  logger.info(`Comparing Source ID: ${req.query.id} with Target ID: ${req.query.targetId}`)
  if (req.query.id === req.query.targetId) {
    return res.status(400).json({ error: 'Source and Target IDs cannot be the same' })
  } else if (!req.query.id || !req.query.targetId) {
    return res.status(400).json({ error: 'Source and Target IDs are required' })
  }

  const changeJson = JSON.parse(await changeLogDiffOperation(req.query.id as string, req.query.targetId as string))
  // console.log(JSON.stringify(changeJson))
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'APHL VSM'
  workbook.lastModifiedBy = 'APHL VSM'
  workbook.created = new Date()
  workbook.modified = new Date()

  const targetLibrary = (await fhirCdrClient.read({
    resourceType: 'Library',
    id: req.query.targetId as string
  })) as fhir4.Library

  const grouperLibrary = (await getGrouperLibrary(targetLibrary)) as fhir4.Library
  const grouperLibDiffJson = changeJson.pages.filter(
    (page: any) => page.oldData.resourceType === 'Library' && page.oldData?.id?.operation?.newValue === grouperLibrary.id
  )?.[0]
  const groupingValueSetsChangeLogs = changeJson.pages.filter((page: any) => page.newData.resourceType === 'ValueSet')

  generateReadMeSheet(workbook, changeJson.pages[0])
  generatePlanDefSheet(workbook, changeJson.pages.filter((page: any) => page.newData.resourceType === 'PlanDefinition')?.[0])
  generateRCTCSheet(workbook, grouperLibrary, grouperLibDiffJson)

  await generateGrouperValuesetSheet(workbook, groupingValueSetsChangeLogs)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="Report.xlsx"')

  await workbook.xlsx.write(res)
  res.status(200).end()
}

const getProgramVersions = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  try {
    const payload = (await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        _elements: 'version',
        _count: 1000
      }
    })) as fhir4.Bundle

    const libs =
      payload?.entry
        ?.map((entry) => entry.resource)
        ?.filter((i) => i?.id !== req.query.id && i?.meta?.profile?.find((i) => i.endsWith('us-ph-specification-library'))) || []
    return res.status(200).json(libs)
  } catch (error: any) {
    logger.error(error)
    return res.status(500).json({ error: error?.error || error || 'Unspecified error' })
  }
}

export default handler({
  POST: { action: downloadChangeLog },
  GET: { action: getProgramVersions }
})
