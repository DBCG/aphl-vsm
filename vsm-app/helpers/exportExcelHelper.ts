import ExcelJS from 'exceljs'
import { fhirCdrClient } from '@/fhirClients'
import { getVsSteward, getVsAuthor } from '@/helpers/valueSetHelpers'
import { startCase, uniq } from 'lodash'

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
  parentValueSetName: string
  codeSystemName: string
  display: string
  version: string
  system: string
  code: string
  memberOid: string
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
    insert: []
  } as CollectedChangeMap

  const gatherNewValues = (artifact: any, keyName?: string) => {
    Object.entries(artifact).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        // @ts-ignore
        if ('operation' in value && value.operation.type !== 'replace' && typeof value?.value !== 'object') {
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

const OPERATION_TYPES = {
  INSERT: 'insert',
  DELETE: 'delete'
}

/**
 * Autosorts the table based on the content of the rows. Not recommended to use this more than once per sheet.
 * Doing so will distort the rows for other tables.
 * @param table
 * @param tableRows
 * @param sheet
 */
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
  const input = JSON.stringify({
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
  })
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

// Merges the old and new data into a single object
const mergeChanges = (oldData: CollectedChangeMap, newData: CollectedChangeMap) => {
  const mergedData = {} as CollectedChangeMap
  Object.entries(oldData).forEach(([key, value]) => {
    if (newData[key]) {
      mergedData[key] = value?.concat(newData[key])
    } else {
      mergedData[key] = value
    }
  })
  return mergedData
}

const generateReadMeSheet = (workbook: ExcelJS.Workbook, rootLibraryChangesJson: any) => {
  const readmeSheet = workbook.addWorksheet('Read Me')

  // New Conditions
  let newConditions = extractConditions(rootLibraryChangesJson)

  if (newConditions.length > 0) {
    readmeSheet.columns = [{ header: 'New Conditions', key: 'newConditions', width: 10 }]
    newConditions = uniq(newConditions)
    newConditions.forEach((newConditions: string) => {
      readmeSheet.addRow({ newConditions })
    })
    readmeSheet.getCell('A1').font = { bold: true }
  }
  const dataDiff = mergeChanges(collector(rootLibraryChangesJson?.oldData), collector(rootLibraryChangesJson?.newData))
  const libDefRows = Object.values(dataDiff)
    .flatMap((i) => i)
    .map((row) => [row.keyName, row.value, row?.operation?.newValue, row.change])
    .filter((i) => i[0] !== 'relatedArtifacts') // The new value doesn't look very good in the table because its a nested json

  const readMeTable = readmeSheet.addTable({
    name: 'read_me',
    ref: `A${newConditions.length + 3}`,
    headerRow: true,
    style: {
      theme: 'TableStyleDark3',
      showRowStripes: true
    },
    columns: [
      { name: 'Field Name', filterButton: true },
      { name: 'Old Value', filterButton: true },
      { name: 'New Value', filterButton: true },
      { name: 'Change', filterButton: true }
    ],
    rows: libDefRows
  })
  autosortTable(readMeTable, libDefRows, readmeSheet)
}

const generatePlanDefSheet = (workbook: ExcelJS.Workbook, planDefChanges: any) => {
  const planDefData = mergeChanges(collector(planDefChanges.oldData), collector(planDefChanges.newData))
  const planDefRows = Object.values(planDefData)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)
    .map((row) => [row.change, row.keyName, row.value, row.operation.newValue])
  if (planDefRows.length > 0) {
    const planDefinitionSheet = workbook.addWorksheet('Plan Definition')
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
  }
}

const generateRCTCSheet = (workbook: ExcelJS.Workbook, grouperLibrary: fhir4.Library, grouperLibDiffJson: any) => {
  const grouperLibDiff = mergeChanges(collector(grouperLibDiffJson.oldData), collector(grouperLibDiffJson.newData))
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
  rctcInfoRows.forEach((row, index) => {
    const cell = rctcSheet.getCell(`A${index + 1}`)
    cell.font = { bold: true, color: { argb: 'FF0000FF' } }
  })
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
      { name: 'Field Name', filterButton: true },
      { name: 'Old Value', filterButton: true },
      { name: 'New Value', filterButton: true },
      { name: 'Change', filterButton: true }
    ],
    rows: rctcRows
  })

  autosortTable(rctcTable, rctcInfoRows, rctcSheet)
}

const generateGrouperValuesetSheet = async (workbook: ExcelJS.Workbook, groupingValueSetsChangeLogs: any) => {
  await Promise.all(
    groupingValueSetsChangeLogs.map(async (page: any) => {
      const currentId = page.newData.id.value // Possibility that id has changed but we taking the new one for title
      const grouperVs = (await fhirCdrClient.read({
        resourceType: 'ValueSet',
        id: currentId
      })) as fhir4.ValueSet

      const groupingValueSetSheet: ExcelJS.Worksheet = workbook.addWorksheet(grouperVs?.name || grouperVs?.title)
      const vsInfo = [
        ['Value Set Name', grouperVs.title],
        ['OID', grouperVs?.identifier?.[0]?.value],
        ['Type', 'Grouping'],
        ['Definition Version', grouperVs.status],
        ['Steward', getVsSteward(grouperVs)],
        ['Author', getVsAuthor(grouperVs)],
        ['Publisher', grouperVs.publisher],
        ['Purpose', grouperVs.purpose],
        ['Description', grouperVs.description],
        ['Version', grouperVs.version]
      ]
      groupingValueSetSheet.addRows(vsInfo)
      // Bold the headers
      vsInfo.forEach((row, index) => {
        const cell = groupingValueSetSheet.getCell(`A${index + 1}`)
        cell.font = { bold: true, color: { argb: 'FF0000FF' } }
      })

      // ValueSet CodeSystem Changes
      const groupingListRows = [] as any

      const groupingTableStartRowCount = vsInfo.length + 3
      let conditionsAdded = 0 // Every condition will be a row we need to increment for Code List table start
      const fillGroupingListTableRows = (data: any) => {
        Object.entries(data).forEach(([key, change]) => {
          // @ts-ignore todo: fix this
          change?.forEach((rowValue) => {
            const { conditions, memberOid, name, codeSystems, status } = rowValue

            const vsCodeSystemName = codeSystems?.[0]?.name || ''
            const vsCodeSystemOid = codeSystems?.[0]?.oid || ''
            conditions?.forEach((condition: any) => {
              conditionsAdded += 1 // Increment row count
              const { code, system, version, display, codeSystemName } = condition
              groupingListRows.push([
                name,
                memberOid,
                vsCodeSystemName,
                vsCodeSystemOid,
                status,
                display,
                code,
                codeSystemName,
                version,
                key
              ])
            })
          })
        })
      }

      const leafValueSets = mergeChanges(collector(page.oldData.leafValuesets), collector(page.newData.leafValuesets))
      fillGroupingListTableRows(leafValueSets)

      if (groupingListRows.length > 0) {
        const groungListTableTitle = groupingValueSetSheet.getCell(`A${groupingTableStartRowCount}`)
        groungListTableTitle.value = 'Grouping List'
        groungListTableTitle.font = { bold: true, color: { argb: 'FF0000FF' } }
        const groupingListTable = groupingValueSetSheet.addTable({
          name: 'valueset_groupinglist_' + currentId,
          ref: `A${groupingTableStartRowCount + 1}`,
          headerRow: true,
          style: {
            theme: 'TableStyleDark3',
            showRowStripes: true
          },
          columns: [
            { name: 'Name', filterButton: true },
            { name: 'OID', filterButton: true },
            { name: 'Code System', filterButton: true },
            { name: 'Code System OID', filterButton: true },
            { name: 'Status', filterButton: true },
            { name: 'Condition Name', filterButton: true },
            { name: 'Condition Code', filterButton: true },
            { name: 'Condition Code System', filterButton: true },
            { name: 'Condition Code Version', filterButton: true },
            { name: 'Change', filterButton: true }
          ],
          rows: groupingListRows
        })
        autosortTable(groupingListTable, groupingListRows, groupingValueSetSheet)
      }

      // ValueSet CodeSystem Changes
      const codeRows = [] as any
      const fillCodeRows = (data: CollectedChangeMap) => {
        Object.entries(data).forEach(([key, value]) => {
          value?.forEach((rowValue) => {
            const { display: descriptor, memberOid, version, code, codeSystemName, parentValueSetName } = rowValue
            const status = startCase(grouperVs?.status || '')
            const remapInfo = status === 'Active' ? 'No' : 'Yes'
            codeRows.push([parentValueSetName, memberOid, code, descriptor, codeSystemName, version, status, remapInfo, key])
          })
        })
      }
      const dataCodes = mergeChanges(collector(page.oldData.codes), collector(page.newData.codes))

      fillCodeRows(dataCodes)

      const codeRowsStartRowCount = groupingTableStartRowCount + conditionsAdded + 5
      if (codeRows.length > 0) {
        const tableTitle = groupingValueSetSheet.getCell(`A${codeRowsStartRowCount}`)
        tableTitle.value = 'Code List'
        tableTitle.font = { bold: true, color: { argb: 'FF0000FF' } }
        const table = groupingValueSetSheet.addTable({
          name: 'valueset_codelist_' + currentId,
          ref: `A${codeRowsStartRowCount + 1}`,
          headerRow: true,
          style: {
            theme: 'TableStyleDark3',
            showRowStripes: true
          },
          columns: [
            { name: 'Name', filterButton: true },
            { name: 'Member OID', filterButton: true },
            { name: 'Code', filterButton: true },
            { name: 'Descriptor', filterButton: true },
            { name: 'Code System', filterButton: true },
            { name: 'Version', filterButton: true },
            { name: 'Status', filterButton: true },
            { name: 'RemapInfo', filterButton: true },
            { name: 'Change', filterButton: true }
          ],
          rows: codeRows
        })
      }
    })
  )
}

export {
  collector,
  OPERATION_TYPES,
  generatePlanDefSheet,
  generateRCTCSheet,
  generateReadMeSheet,
  generateGrouperValuesetSheet,
  autosortTable,
  changeLogDiffOperation,
  extractConditions
}
