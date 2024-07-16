import ExcelJS from 'exceljs'
import { fhirCdrClient } from '@/fhirClients'
import { getVsSteward, getVsAuthor } from '@/helpers/valueSetHelpers'
import { startCase, times, uniq } from 'lodash'

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
    return maxContentWidth + 4
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

const generateReadMeSheet = (
  workbook: ExcelJS.Workbook,
  sourceGrouperLibrary: fhir4.Library,
  targetGrouperLibrary: fhir4.Library,
  rootLibraryChangesJson: any
) => {
  const readmeSheet = workbook.addWorksheet('Read Me')
  readmeSheet.getColumn('A').width = 30
  readmeSheet.getColumn('B').width = 60
  const style = {
    alignment: { vertical: 'middle', horizontal: 'left' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } },
    border: {
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
      right: { style: 'thick' }
    }
  }
  const currentVersionHeader = readmeSheet.addRow(['Current Version'])
  currentVersionHeader.font = { bold: true }
  const currentVersion = readmeSheet.addRows([
    ['Name', sourceGrouperLibrary.title],
    ['Purpose', sourceGrouperLibrary?.purpose],
    ['RCTC OID', sourceGrouperLibrary?.id?.toString()],
    ['RCTC Definition Version', sourceGrouperLibrary?.version],
    ['RCTC Definition Effective Start Date', sourceGrouperLibrary?.effectivePeriod?.start],
    ['RCTC Release Label', sourceGrouperLibrary?.version]
  ])
  readmeSheet.addRow([]) // Add new line
  const previousVersionHeader = readmeSheet.addRow(['Previous Version'])
  previousVersionHeader.font = { bold: true }
  const previousVersion = readmeSheet.addRows([
    ['Name', targetGrouperLibrary.title],
    ['Purpose', targetGrouperLibrary?.purpose],
    ['RCTC OID', targetGrouperLibrary?.id],
    ['RCTC Definition Version', targetGrouperLibrary?.version],
    ['RCTC Definition Effective Start Date', targetGrouperLibrary?.effectivePeriod?.start],
    ['RCTC Release Label', targetGrouperLibrary?.version]
  ])
  const cellsToStyle = [currentVersion, previousVersion]
  cellsToStyle.forEach((rows) => {
    rows.forEach((cell) => {
      times(2, (i) => {
        const retrievedCell = cell.getCell(i + 1) // Add 1 because not zero based index
        if (retrievedCell == null) {
          throw new Error('Something went wrong while generating README Sheet')
        }
        if (i === 0) {
          // Bold only the first column
          retrievedCell.font = { bold: true }
        }
        //@ts-ignore
        retrievedCell.alignment = style.alignment
        //@ts-ignore
        retrievedCell.fill = style.fill
        //@ts-ignore
        retrievedCell.border = style.border
      })
    })
  })

  readmeSheet.addRows([[], []]) // Add new line
  // New Conditions
  let newConditions = extractConditions(rootLibraryChangesJson)

  if (newConditions.length > 0) {
    const conditionTitle = readmeSheet.addRow(['New Conditions'])
    conditionTitle.font = { bold: true }
    newConditions = uniq(newConditions)
    newConditions.forEach((newConditions: string) => {
      readmeSheet.addRow([newConditions])
    })
  }
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
      style: {},
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
  rctcSheet.getColumn('A').width = 30
  rctcSheet.getColumn('B').width = 60
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

  if (rctcRows.length > 0) {
    const rctcTable = rctcSheet.addTable({
      name: 'rctcDiff',
      ref: `A${rctcInfoRows.length + 5}`,
      headerRow: true,
      style: {},
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
      groupingValueSetSheet.getColumn('A').width = 30
      groupingValueSetSheet.getColumn('B').width = 60
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
          style: {},
          columns: [
            { name: 'Name' },
            { name: 'OID' },
            { name: 'Code System' },
            { name: 'Code System OID' },
            { name: 'Status' },
            { name: 'Condition Name' },
            { name: 'Condition Code' },
            { name: 'Condition Code System' },
            { name: 'Condition Code Version' },
            { name: 'Change' }
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
          style: {},
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
