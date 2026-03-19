import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import ExcelJS from 'exceljs'
import Logger from '@/helpers/server/logger'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { isImplementer, VSMSession } from '@/helpers/rolesHelper'

const downloadChangeLog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const diffResult = req.body as fhir4.Parameters

  Logger.getLogger().info(`Comparing Source VSP ID: ${req.query.id} with Target VSP ID: ${req.query.targetId}`)
  if (!diffResult || diffResult.resourceType !== 'Parameters') {
    return res.status(400).json({ error: 'Need artifact diff data (Parameters resource) to continue' })
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'APHL VSM'
  workbook.lastModifiedBy = 'APHL VSM'
  workbook.created = new Date()
  workbook.modified = new Date()

  const targetVSP = (await FhirClient.getInstance().read({
    resourceType: 'Library',
    id: req.query.targetId as string
  })) as fhir4.Library

  const sourceVSP = (await FhirClient.getInstance().read({
    resourceType: 'Library',
    id: req.query.id as string
  })) as fhir4.Library

  // Create a changelog sheet for VSPs based on FHIR patch format
  const worksheet = workbook.addWorksheet('VSP Comparison')

  // Header
  worksheet.addRow(['Value Set Package Comparison Report'])
  worksheet.addRow([])
  worksheet.addRow(['Source VSP:', sourceVSP.title || sourceVSP.id])
  worksheet.addRow(['Source Version:', sourceVSP.version])
  worksheet.addRow(['Target VSP:', targetVSP.title || targetVSP.id])
  worksheet.addRow(['Target Version:', targetVSP.version])
  worksheet.addRow([])

  // Process FHIR patch operations
  worksheet.addRow(['Changes (FHIR Patch Format):'])
  worksheet.addRow([])
  worksheet.addRow(['Operation', 'Path', 'Value/Details'])

  const parameters = diffResult.parameter || []

  parameters.forEach((param: fhir4.ParametersParameter) => {
    // Each parameter may contain patch operations
    if (param.name === 'patch' && param.part) {
      param.part.forEach((operation: fhir4.ParametersParameter) => {
        const op = operation.name || 'unknown'
        const path = operation.part?.find((p: fhir4.ParametersParameter) => p.name === 'path')?.valueString || 'N/A'
        const value = operation.part?.find((p: fhir4.ParametersParameter) => p.name === 'value')?.valueString
                   || operation.part?.find((p: fhir4.ParametersParameter) => p.name === 'value')?.valueInteger
                   || operation.part?.find((p: fhir4.ParametersParameter) => p.name === 'value')?.valueBoolean
                   || 'N/A'

        worksheet.addRow([op, path, JSON.stringify(value)])
      })
    }
  })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="VSP_Comparison_Report.xlsx"')

  await workbook.xlsx.write(res)
  res.status(200).end()
}

const getVSPVersions = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession): Promise<void> => {
  try {
    const payload = (await FhirClient.getInstance().search({
      resourceType: 'Library',
      searchParams: {
        context: 'value-set-package',
        _elements: 'version,id,title,status',
        _count: 1000
      }
    })) as fhir4.Bundle

    let libs =
      payload?.entry
        ?.map((entry) => entry.resource)
        ?.filter((i) => i?.id !== req.query.id) || []

    if (isImplementer(session)) {
      libs = libs.filter((i) => (i as fhir4.Library)?.status !== 'draft')
    }

    return res.status(200).json(libs)
  } catch (error: any) {
    Logger.getLogger().error(error)
    return res.status(500).json({ error: error?.error || error || 'Unspecified error' })
  }
}

export default handler({
  POST: { action: downloadChangeLog, access: ['admin', 'publisher', 'editor', 'reviewer'] },
  GET: { action: getVSPVersions }
})
