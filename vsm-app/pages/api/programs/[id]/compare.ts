import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/helpers/server/handler'
import ExcelJS from 'exceljs'
import logger from '@/helpers/server/logger'
import { fhirCdrClient } from '@/fhirClients'
// import changeLogJson from '../../../../test_fixtures/change-log-response.json'

const OPERATION_TYPES = {
  INSERT: 'insert',
  REPLACE: 'replace',
  DELETE: 'delete'
}

// Go to newData
// recursive search for "operation"
// if found in the case of replace
// use path parameter against the root (aka most parent object) to get the new value, and use oldValue set in the operation for the old value

const collector = (input) => {
  const operation = {
    delete: [],
    insert: [],
    replace: []
  }

  const gatherNewValues = (artifact, keyName) => {
    Object.entries(artifact).forEach(([key, value]) => {
      if (typeof value === 'object') {
        if ('operation' in value) {
          operation[value.operation.type].push({ keyName: keyName || key, change: value.operation.type, ...value })
        } else {
          gatherNewValues(value, key)
        }
      }
    })
  }
  gatherNewValues(input)
  return operation
}

const autosortTable = (table, tableRows, sheet) => {
  // Calculate column width
  // https://github.com/exceljs/exceljs/discussions/2535#discussioncomment-8419612
  const columnWidths = table.table.columns.map((column, columnIndex) => {
    /**
     * Max width for each column.
     */
    const maxContentWidth = tableRows.reduce((maxWidth, row) => {
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
  columnWidths.forEach((width, columnIndex) => {
    sheet.getColumn(columnIndex + 1).width = width
  })
}

const changeLogDiffOperation = async (sourceId, targetId) => {
  const changeJson = await fhirCdrClient.operation({
    name: '$create-changelog',
    input: JSON.stringify({
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
          valueBoolean: 'true'
        },
        {
          name: 'compareExecutable',
          valueBoolean: 'true'
        }
      ]
    }),
    method: 'POST',
    options: {
      headers: {
        'Content-Type': `application/fhir+json`,
        ...fhirCdrClient.customHeaders
      }
    }
  })

  return changeJson
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
  const changeJson = changeLogDiffOperation(req.query.id, req.query.targetId)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'APHL VSM'
  workbook.lastModifiedBy = 'APHL VSM'
  workbook.created = new Date()
  workbook.modified = new Date()

  /**
   * README SHEET for Root Library
   */
  const readmeSheet = workbook.addWorksheet('Read Me')
  readmeSheet.columns = [{ header: 'New Conditions', key: 'newConditions', width: 10 }]
  logger.info(`Comparing Source ID: ${req.query.id} with Target ID: ${req.query.targetId}`)
  const newConditions = extractConditions(changeJson.pages[0])

  const dataDiff = collector(changeJson.pages[0].oldData)

  const libDefRows = Object.values(dataDiff)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)
    .map((row) => [row.change, row.keyName, row.value, row.operation.newValue])

  newConditions.forEach((newConditions: string) => {
    readmeSheet.addRow({ newConditions })
  })

  // readmeSheet.addTable({
  //   name: 'Read Me',
  //   ref: `A${newConditions.length + 5}`,
  //   headerRow: true,
  //   // totalsRow: true,
  //   style: {
  //     theme: 'TableStyleDark3',
  //     showRowStripes: true
  //   },
  //   columns: [
  //     { name: 'Change', filterButton: true },
  //     { name: 'Field Name', filterButton: true },
  //     { name: 'Old Value', filterButton: true },
  //     { name: 'New Value', filterButton: true }
  //   ],
  //   rows: libDefRows
  // })

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
    name: 'PlanDefinition',
    ref: `A1`,
    headerRow: true,
    // totalsRow: true,
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
   * ValueSet Library
   */

  const rctcLib = (await fhirCdrClient.read({
    resourceType: 'Library',
    id: 'library-rctc-example'
    // id: req.query.id as string
  })) as fhir4.Library
  const rctcDataDiff = collector(changeJson.pages[1].oldData)
  const rctcSheet = workbook.addWorksheet('Value Set Library')

  const rctcInfoRows = [
    ['Name', rctcLib.title],
    ['OID', rctcLib?.identifier?.[0]?.value],
    ['Status', rctcLib.status],
    ['Publisher', rctcLib.publisher],
    ['Purpose', rctcLib.purpose],
    ['Description', rctcLib.description],
    ['Version', rctcLib.version],
    ['Date', rctcLib.effectivePeriod?.start]
  ]
  rctcSheet.addRows(rctcInfoRows)

  const rctcRows = Object.values(rctcDataDiff)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)
    .map((row) => [row.change, row.keyName, row.value, row.operation.newValue])

  rctcSheet.addTable({
    name: 'rctcDiff',
    ref: `A${rctcInfoRows.length + 5}`,
    headerRow: true,
    // totalsRow: true,
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

  /**
   *
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
        id: '2.16.840.1.113762.1.4.1146.1506'
        // id: currentId
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
      groupingValueSetSheet.addRows(rctcInfoRows)

      // ValueSet CodeSystem Changes
      const rows = [] as any
      const fillRows = (data) => {
        Object.entries(data).forEach(([key, value]) => {
          value?.forEach((rowValue) => {
            const { change, display, version, system, code, memberOid } = rowValue
            rows.push([change, display, version, system, code, memberOid])
          })
        })
      }

      fillRows(oldData)
      fillRows(newData)

      const table = groupingValueSetSheet.addTable({
        name: 'ValueSets',
        ref: `A${vsInfo.length + 5}`,
        headerRow: true,
        // totalsRow: true,
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
          { name: 'Code System', filterButton: true }
        ],
        rows
      })
      autosortTable(table, rows, groupingValueSetSheet)
    })
  )
  //   // Start Drawing
  //   const headerCells = ["A1", "B1", "C1", "D1", "E1", "F1"]
  //   headerCells.map((key) => {
  //     groupingValueSetSheet.getCell(key).font = { bold: true }
  //     groupingValueSetSheet.getCell(key).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '884EA5' } }
  //   })

  //   groupingValueSetSheet.columns = [
  //     { header: 'Change', key: 'change', width: 10 },
  //     { header: 'Name', key: 'name', width: 80 },
  //     { header: 'OID', key: 'memberOid', width: 50 },
  //     { header: 'Version', key: 'version', width: 30 },
  //     { header: 'Code', key: 'code', width: 20 },
  //     { header: 'Code System', key: -'system', width: 30 }
  //   ]

  //   const addRowData = (data) => {
  //     Object.entries(data).forEach(([key, value]) => {
  //       value.forEach((rowValue) => {
  //         const { change, display, version, system, code, memberOid } = rowValue
  //         const row = groupingValueSetSheet.addRow({ change, name: display, memberOid, version, code, system }, 'n')
  //         // row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }
  //         // row.font = { bold: false }
  //       })
  //     })
  //   }
  //   addRowData(oldData)
  //   addRowData(newData)
  // })

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
        _elements: 'version'
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
