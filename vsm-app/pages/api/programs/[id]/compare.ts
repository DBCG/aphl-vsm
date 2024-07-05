import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import ExcelJS from 'exceljs'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
import { getGrouperLibrary } from './details/valuesets'
import { addTerminologyEndpointToParameters } from './package'
// import changeLogJson from '../../../../test_fixtures/change-log-response.json'

const OPERATION_TYPES = {
  INSERT: 'insert',
  REPLACE: 'replace',
  DELETE: 'delete'
}

interface CollectedChange extends ChangeValue {
  keyName: string
  change: string
}

type ChangeValue = {
  value: any
  operation: {
    type: string
    newValue: any
  }
  display?: string
  version?: string
  system?: string
  code?: string
  memberOid?: string
  codeSystemOid?: string
}

type CollectedChangeMap = {
  [key: string]: CollectedChange[]
}

// Go to newData
// recursive search for "operation"
// if found in the case of replace
// use path parameter against the root (aka most parent object) to get the new value, and use oldValue set in the operation for the old value
const collector = (input: any) => {
  const operation = {
    delete: [],
    insert: [],
    replace: []
  } as CollectedChangeMap

  const gatherNewValues = (artifact: any, keyName?: string) => {
    Object.entries(artifact).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        // @ts-ignore
        if ('operation' in value && typeof value?.value !== 'object') {
          // @ts-ignore
          operation[value?.operation?.type].push({ keyName: keyName || key, change: value?.operation?.type, ...value } as CollectedChange)
        } else {
          gatherNewValues(value, key)
        }
      }
    })
  }
  gatherNewValues(input)
  return operation
}

const autosortTable = (table: ExcelJS.Table, tableRows: ExcelJS.Rows, sheet: ExcelJS.Worksheet) => {
  // Calculate column width
  // https://github.com/exceljs/exceljs/discussions/2535#discussioncomment-8419612
  // @ts-ignore
  const columnWidths = table.table.columns.map((column: ExcelJS.TableColumn, columnIndex: number) => {
    /**
     * Max width for each column.
     */
    const maxContentWidth = tableRows.reduce((maxWidth: number, row: ExcelJS.Row[]) => {
      const cellValue = row[columnIndex]
      const cellWidth = cellValue ? String(cellValue).length : 0
      return Math.max(maxWidth, cellWidth)
    }, column.name.length)

    /**
     * Add a extra space.
     */
    return maxContentWidth + 2
  })

  /**
   * Apply width.
   */
  columnWidths.forEach((width: number, columnIndex: number) => {
    sheet.getColumn(columnIndex + 1).width = width
  })
}

const changeLogDiffOperation = async (sourceId: string, targetId: string) => {
  const parameters: fhir4.Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'source',
        valueString: `Library/${sourceId}`
      },
      {
        name: 'target',
        valueString: `Library/${targetId}`
      },
      {
        name: 'compareComputable',
        valueBoolean: true
      },
      {
        name: 'compareExecutable',
        valueBoolean: true
      }
    ]
  }
  // TODO: need to have an ID on this because of a bug in the string parsing
  const input = JSON.stringify(addTerminologyEndpointToParameters(parameters, process.env.NEXT_PUBLIC_VSAC_BASE_URL + '/ValueSet/1'))
  const changeJson = (await fhirCdrClient.operation({
    name: '$create-changelog',
    input,
    method: 'POST',
    options: {
      headers: {
        'Content-Type': `application/fhir+json`,
        ...fhirCdrClient.customHeaders
      }
    }
  })) as fhir4.Binary
  return atob(changeJson.data!)
}

const extractConditions = (rootLibraryChangeDiff: any) => {
  const conditions: string[] = []
  // Get all new conditions
  rootLibraryChangeDiff.newData.relatedArtifacts.forEach((artifact: any) => {
    // Handles case of new conditions being added
    if ('operation' in artifact) {
      if (artifact.operation.type === OPERATION_TYPES.INSERT && 'extension' in artifact.operation.newValue) {
        const conditionNames =
          artifact?.operation?.newValue?.extension
            ?.map((extension: any) => {
              if (extension.url === 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition') {
                return extension.valueCodeableConcept.text
              }
            })
            ?.filter((i: any) => i) || []
        conditions.push(...conditionNames)
      }
    }

    /// TODO: What about handling the case of condition changes? e.g. replace?
    // artifact.conditions.forEach((condition: any) => {
    //   if ("operation" in condition)
    // })
  })
  return conditions
}

const downloadChangeLog = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  logger.info(`Comparing Source ID: ${req.query.id} with Target ID: ${req.query.targetId}`)
  if (req.query.id === req.query.targetId) {
    return res.status(400).json({ error: 'Source and Target IDs cannot be the same' })
  } else if (!req.query.id || !req.query.targetId) {
    return res.status(400).json({ error: 'Source and Target IDs are required' })
  }

  const changeJson = JSON.parse(await changeLogDiffOperation(req.query.id as string, req.query.targetId as string))

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

  /**
   * README SHEET for Root Library
   */
  const readmeSheet = workbook.addWorksheet('Read Me')
  readmeSheet.columns = [{ header: 'New Conditions', key: 'newConditions', width: 10 }]
  const rootLibraryChangesJson = changeJson.pages[0]
  const newConditions = extractConditions(rootLibraryChangesJson)
  const dataDiff = collector(rootLibraryChangesJson?.oldData)

  const libDefRows = Object.values(dataDiff)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)
    .map((row) => [row.change, row.keyName, row.value, row?.operation?.newValue])

  newConditions.forEach((newConditions: string) => {
    readmeSheet.addRow({ newConditions })
  })

  const readMeTable = readmeSheet.addTable({
    name: 'read_me',
    ref: `A${newConditions.length + 5}`,
    headerRow: true,
    style: {
      theme: 'TableStyleDark3',
      showRowStripes: true
    },
    columns: [
      { name: 'Change', filterButton: true },
      { name: 'Field Name', filterButton: true },
      { name: 'Old Value', filterButton: true },
      { name: 'New Value', filterButton: true }
    ],
    rows: libDefRows
  })
  autosortTable(readMeTable, libDefRows, readmeSheet)

  /**
   * PlanDefinition SHEET
   */
  const planDefinitionSheet = workbook.addWorksheet('Plan Definition')
  const planDefinition = changeJson.pages.filter((page: any) => page.newData.resourceType === 'PlanDefinition')?.[0]

  const oldData = collector(planDefinition.oldData)
  const planDefRows = Object.values(oldData)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)
    .map((row) => [row.change, row.keyName, row.value, row.operation.newValue])

  planDefinitionSheet.addTable({
    name: 'plandefinition',
    ref: 'A1',
    headerRow: true,
    style: {
      theme: 'TableStyleDark3',
      showRowStripes: true
    },
    columns: [
      { name: 'Change', filterButton: true },
      { name: 'Field Name', filterButton: true },
      { name: 'Old Value', filterButton: true },
      { name: 'New Value', filterButton: true }
    ],
    rows: planDefRows
  })

  /**
   * ValueSet Library SHEET
   */

  const grouperLibDiffJson = changeJson.pages.filter(
    (page: any) => page.oldData.resourceType === 'Library' && page.oldData?.id?.operation?.newValue === grouperLibrary.id
  )?.[0]

  const grouperLibDiff = collector(grouperLibDiffJson)
  const rctcSheet = workbook.addWorksheet('Value Set Library')

  const rctcInfoRows = [
    ['Name', grouperLibrary.title],
    ['OID', grouperLibrary?.identifier?.[0]?.value],
    ['Status', grouperLibrary.status],
    ['Publisher', grouperLibrary.publisher],
    ['Purpose', grouperLibrary.purpose],
    ['Description', grouperLibrary.description],
    ['Version', grouperLibrary.version],
    ['Date', grouperLibrary.effectivePeriod?.start]
  ]
  rctcSheet.addRows(rctcInfoRows)

  const rctcRows = Object.values(grouperLibDiff)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)
    .map((row) => [row.change, row.keyName, row.value, row.operation.newValue])

  const rctcTable = rctcSheet.addTable({
    name: 'rctcDiff',
    ref: `A${rctcInfoRows.length + 5}`,
    headerRow: true,
    style: {
      theme: 'TableStyleDark3',
      showRowStripes: true
    },
    columns: [
      { name: 'Change', filterButton: true },
      { name: 'Field Name', filterButton: true },
      { name: 'Old Value', filterButton: true },
      { name: 'New Value', filterButton: true }
    ],
    rows: rctcRows
  })

  autosortTable(rctcTable, rctcInfoRows, rctcSheet)

  /**
   * GROUPING VALUE SETS SHEET
   */
  const groupingValueSetsChangeLogs = changeJson.pages.filter((page: any) => page.newData.resourceType === 'ValueSet')
  await Promise.all(
    groupingValueSetsChangeLogs.map(async (page: any) => {
      const currentId = page.newData.id.value // Possibility that id has changed but we taking the new one for title
      const groupingValueSetSheet: ExcelJS.Worksheet = workbook.addWorksheet(`${currentId} - ValueSet`)
      const oldData = collector(page.oldData.codes)
      const newData = collector(page.newData.codes)

      const grouperVs = (await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: currentId
      })) as fhir4.ValueSet

      const vsInfo = [
        ['Name', grouperVs.title],
        ['OID', grouperVs?.identifier?.[0]?.value],
        ['Status', grouperVs.status],
        ['Publisher', grouperVs.publisher],
        ['Purpose', grouperVs.purpose],
        ['Description', grouperVs.description],
        ['Version', grouperVs.version]
      ]
      groupingValueSetSheet.addRows(vsInfo)

      // ValueSet CodeSystem Changes
      const rows = [] as any
      const fillRows = (data: CollectedChangeMap) => {
        Object.entries(data).forEach(([key, value]) => {
          value?.forEach((rowValue) => {
            const { change, display, memberOid, version, code, system, codeSystemOid } = rowValue
            rows.push([change, display, memberOid, version, code, system, codeSystemOid])
          })
        })
      }

      fillRows(oldData)
      fillRows(newData)

      if (rows?.length > 0) {
        const table = groupingValueSetSheet.addTable({
          name: 'valueset_' + currentId,
          ref: `A${vsInfo.length + 5}`,
          headerRow: true,
          style: {
            theme: 'TableStyleDark3',
            showRowStripes: true
          },
          columns: [
            { name: 'Change', filterButton: true },
            { name: 'Name', filterButton: true },
            { name: 'OID', filterButton: true },
            { name: 'Version', filterButton: true },
            { name: 'Code', filterButton: true },
            { name: 'Code System', filterButton: true },
            { name: 'Code System OID', filterButton: true }
          ],
          rows
        })
        autosortTable(table, rows, groupingValueSetSheet)
      }
    })
  )

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
