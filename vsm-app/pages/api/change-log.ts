import ExcelJS from 'exceljs'
import { fhirCdrClient } from '@/fhirClients'
import type { NextApiRequest, NextApiResponse } from 'next'
import changeLogJson from '../../test_fixtures/change-log-response.json'

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
          operation[value.operation.type].push({keyName: keyName || key, change: value.operation.type, ...value })
        } else {
          gatherNewValues(value, key)
        }
      }
    })
  }
  gatherNewValues(input)
  return operation
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {
  // const lib = (await fhirCdrClient.read({
  //   resourceType: 'Library',
  //   id: 'SpecificationLibrary'
  //   // id: req.query.id as string
  // })) as fhir4.Library

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Me'
  workbook.lastModifiedBy = 'Her'
  workbook.created = new Date(1985, 8, 30)
  workbook.modified = new Date()
  workbook.lastPrinted = new Date(2016, 9, 27)

  /**
   * README SHEET
   */
  const readmeSheet = workbook.addWorksheet('Read Me')
  readmeSheet.columns = [{ header: 'New Conditions', key: 'newConditions', width: 10 }]

  let newConditions

  // Get all new conditions
  changeLogJson.pages[0].newData.relatedArtifacts.forEach((artifact: any) => {
    // Handles case of new conditions being added
    if ('operation' in artifact) {
      if (artifact.operation.type === OPERATION_TYPES.INSERT && 'extension' in artifact.operation.newValue) {
        newConditions = artifact.operation.newValue.extension
          .map((extension: any) => {
            if (extension.url === 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition') {
              return extension.valueCodeableConcept.text
            }
          })
          .filter((i) => i)
      }
    }

    /// TODO: What about handling the case of condition changes?
    // artifact.conditions.forEach((condition: any) => {
    //   if ("operation" in condition)
    // })
  })

  newConditions.forEach((newConditions: string) => {
    readmeSheet.addRow({ newConditions })
  })

  const planDefinitionSheet = workbook.addWorksheet('Plan Definition')
  const rctcSheet = workbook.addWorksheet('Value Set Library')

  /**
   *
   * GROUPING VALUE SETS SHEET
   */
  const groupingValueSetsChangeLogs = changeLogJson.pages.filter((page: any) => page.newData.resourceType === 'ValueSet')
  groupingValueSetsChangeLogs.forEach((page: any) => {
    const currentId = page.newData.id.value // Possibility that id has changed but we taking the new one for title
    const groupingValueSetSheet: ExcelJS.Worksheet = workbook.addWorksheet(`${currentId} - ValueSet`)
    const oldData = collector(page.oldData.codes)
    const newData = collector(page.newData.codes)

    const rows = [] as any

    const fillRows = (data) => {
      Object.entries(data).forEach(([key, value]) => {
        value.forEach((rowValue) => {
          const { change, display, version, system, code, memberOid } = rowValue
          rows.push([change, display, version, system, code, memberOid])
        })
      })
    }

    fillRows(oldData)
    fillRows(newData)

    const table = groupingValueSetSheet.addTable({
      name: 'MyTable',
      ref: 'A1',
      headerRow: true,
      // totalsRow: true,
      style: {
        theme: 'TableStyleDark3',
        showRowStripes: true
      },
      columns: [
        { name: 'Change', filterButton: true, width: 10 },
        { name: 'Name', filterButton: true, width: 80 },
        { name: 'OID', filterButton: true, width: 50 },
        { name: 'Version', filterButton: true, width: 30 },
        { name: 'Code', filterButton: true, width: 20 },
        { name: 'Code System', filterButton: true, width: 30 }
      ],
      rows
    })

    // Calculate column width
    // https://github.com/exceljs/exceljs/discussions/2535#discussioncomment-8419612
    const columnWidths = table.table.columns.map(
      (column, columnIndex) => {
        /**
         * Max width for each column.
         */
        const maxContentWidth = rows.reduce((maxWidth, row) => {
          const cellValue = row[columnIndex]
          const cellWidth = cellValue ? String(cellValue).length : 0
          return Math.max(maxWidth, cellWidth)
        }, column.name.length)

        /**
         * Add a extra space.
         */
        return maxContentWidth + 2
      }
    )

    /**
     * Apply width.
     */
    columnWidths.forEach((width, columnIndex) => {
      groupingValueSetSheet.getColumn(columnIndex + 1).width = width
    })

  })

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
  //     { header: 'Code System', key: 'system', width: 30 }
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
