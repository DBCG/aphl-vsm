import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import ExcelJS from 'exceljs'
import Logger from '@/helpers/server/logger'
import FhirClient from '@/backend/clients/FhirCdrClient'
import {
  generateReadMeSheet,
  generatePlanDefSheet,
  generateRCTCSheet,
  generateGrouperValuesetSheet
} from '@/helpers/exportExcelHelper'
import { getGrouperLibrary } from '@/helpers/server/serverLibraryHelper'
import { isImplementer, VSMSession } from '@/helpers/rolesHelper'

const downloadChangeLog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {

  const changeJson = req.body

  Logger.getLogger().info(`Comparing Source ID: ${req.query.id} with Target ID: ${req.query.targetId}`)
  if (!changeJson) {
    return res.status(400).json({ error: 'Need changelog data to continue' })
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'APHL VSM'
  workbook.lastModifiedBy = 'APHL VSM'
  workbook.created = new Date()
  workbook.modified = new Date()

  const targetLibrary = (await FhirClient.getInstance().read({
    resourceType: 'Library',
    id: req.query.targetId as string
  })) as fhir4.Library

  const sourceLibrary = (await FhirClient.getInstance().read({
    resourceType: 'Library',
    id: req.query.id as string
  })) as fhir4.Library

  const sourceGrouperLibrary = (await getGrouperLibrary(sourceLibrary)) as fhir4.Library
  const targetGrouperLibrary = (await getGrouperLibrary(targetLibrary)) as fhir4.Library
/*  const grouperLibDiffJson = changeJson.pages.filter(
    (page: any) => page.resourceType === 'Library' && page.url === targetGrouperLibrary.url
  )?.[0]*/

  const groupingValueSetsChangeLogs = changeJson.pages.filter((page: any) => page.resourceType === 'ValueSet')

  generateReadMeSheet(workbook, sourceGrouperLibrary, targetGrouperLibrary, changeJson.pages[0])
  //generatePlanDefSheet(workbook, changeJson.pages.filter((page: any) => page.resourceType === 'PlanDefinition')?.[0])
  //generateRCTCSheet(workbook, targetGrouperLibrary, grouperLibDiffJson)

  await generateGrouperValuesetSheet(workbook, groupingValueSetsChangeLogs)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="Report.xlsx"')

  await workbook.xlsx.write(res)
  res.status(200).end()
}

const getProgramVersions = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession): Promise<void> => {
  try {
    const payload = (await FhirClient.getInstance().search({
      resourceType: 'Library',
      searchParams: {
        _elements: 'version,status',
        _count: 1000
      }
    })) as fhir4.Bundle

    let libs =
      payload?.entry
        ?.map((entry) => entry.resource)
        ?.filter((i) => i?.id !== req.query.id && i?.meta?.profile?.find((i) => i.endsWith('us-ph-specification-library'))) || []

    if (isImplementer(session)) {
      libs = libs.filter((i) => (i as fhir4.Library)?.status !== 'draft')
    }

    return res.status(200).json(libs)
  } catch (error: any) {
    Logger.getLogger().error(error)
    return res.status(500).json({ error: error?.error || error || 'Unspecified error' })
  }
}

// The download POSTs the entire changelog as the request body, which for a full eRSD program
// runs well past the 1mb default.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  }
}

export default handler({
  POST: { action: downloadChangeLog, access: ['admin', 'publisher', 'editor', 'reviewer'] },
  GET: { action: getProgramVersions }
})
