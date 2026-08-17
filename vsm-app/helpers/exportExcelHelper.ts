import ExcelJS from 'exceljs'
import FhirClient from '@/backend/clients/FhirCdrClient'
import { getVsSteward, getVsAuthor, getOid } from '@/helpers/valueSetHelpers'
import { fetchByCanonical } from '@/helpers/server/serverValueSetHelper'
import { startCase, times, uniq } from 'lodash'
import { Agent, fetch as f } from 'undici'
interface CollectedChange extends ChangeValue {
  keyName: string
  change: string
}

type ChangeValue = {
  value: any
  operation: {
    type: string
    newValue: any
    oldValue?: any
    path?: string
  }
  parentValueSetName: string
  codeSystemName: string
  display: string
  version: string
  system: string
  codeValue: string
  memberOid: string
}

type CollectedChangeMap = {
  [key: string]: CollectedChange[]
}

const OPERATION_TYPES = {
  INSERT: 'insert',
  DELETE: 'delete',
  REPLACE: 'replace'
}

// Recursively walks a changelog page side (oldData or newData) collecting every element that
// carries an `operation`, bucketed by operation type. A replace is only ever half-present on a
// given side (see buildChangeRows), so both sides need collecting to render one.
const collector = (input: any) => {
  const operation: CollectedChangeMap = {
    delete: [],
    insert: [],
    replace: []
  }

  if (input) {
    gatherNewValues(input)
  }
  return operation
  function gatherNewValues(artifact: any, keyName?: string) {
    Object.entries(artifact).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') {
        return
      }
      const change = (value as any)?.operation?.type
      // an element whose own `value` is a primitive is a leaf change we can render as a row;
      // anything else is a container we need to walk into
      const isLeafChange = 'operation' in value && typeof (value as any)?.value !== 'object'
      if (isLeafChange && change) {
        // optional chaining guards against operation types we don't bucket (rather than throwing)
        operation[change]?.push({ keyName: keyName || key, change, ...(value as any) } as CollectedChange)
      }
      // Replaces used to be skipped entirely, which meant this node was still traversed for any
      // nested insert/delete children. Keep recursing on them so that behaviour is preserved.
      if (!isLeafChange || change === OPERATION_TYPES.REPLACE) {
        gatherNewValues(value, key)
      }
    })
  }
}

/**
 * Builds a table name Excel will accept. Grouper ids look like "dxtc-3.2.2", this logic converts the hyphen and periods
 * to underscores to ensure the table name is valid.
 */
const toTableName = (prefix: string, id: string) => `${prefix}_${String(id ?? '').replaceAll(/\W/g, '_')}`

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

const changeLogDiffOperation = async (sourceId: string, targetId: string, input: fhir4.Parameters) => {
  const changeJson = await f(`${FhirClient.getInstance().baseUrl}/Library/$create-changelog`, {
    body: JSON.stringify(input),
    method: 'POST',
    dispatcher: new Agent({
      connectTimeout: 24 * 60 * 60 * 1000,
      headersTimeout: 24 * 60 * 60 * 1000,
      keepAliveTimeout: 24 * 60 * 60 * 1000,
      keepAliveMaxTimeout: 24 * 60 * 60 * 1000
    }),
    // @ts-ignore
    headers: {
      'Content-Type': 'application/fhir+json',
      ...FhirClient.getInstance().customHeaders
    }
  }).then((response) => response.json())

  return (changeJson!)
}

const extractConditions = (rootLibraryChangeDiff: any) => {
  const conditions: string[] = []

  // Get all new conditions
  rootLibraryChangeDiff.newData.relatedArtifacts.forEach((artifact: any) => {
    // Handles case of new conditions being added
    if ('operation' in artifact) {
      const op = artifact.operation
      if (op?.type === OPERATION_TYPES.INSERT && op?.newValue?.extension?.length) {
        const conditionNames =
          op.newValue.extension
            ?.map((extension: any) => {
              // only consider CRMI intendedUsageContext extensions that represent conditions (focus)
              const isCrmi = extension?.url && extension.url.endsWith('crmi-intendedUsageContext')
              const vuc = extension?.valueUsageContext
              const isFocus = !!vuc && vuc?.code?.code === 'focus'
              if (isCrmi && isFocus) {
                return vuc?.valueCodeableConcept?.text
              }
              return undefined
            })
            ?.filter((i: any) => i) || []
        conditions.push(...conditionNames)
      }
    }
  })

  return conditions
}

/**
 * Turns a merged change map into [Change, Field Name, Old Value, New Value] rows.
 *
 * Inserts and deletes only exist on one side, so their canonical goes in the matching column.
 * A replace is split across both sides by Page.addReplaceOperation, where each side holds its own
 * canonical in `value` and points at the other side through the operation: the oldData entry gets
 * operation.newValue (what it changed to) and the newData entry gets operation.oldValue (what it
 * changed from). So the half carrying newValue is the old side, and vice versa. The two are paired
 * by operation.path to render a single row.
 */
const buildChangeRows = (changeMap: CollectedChangeMap) => {
  const changes = Object.values(changeMap)
    ?.filter((i) => i?.length > 0)
    .flatMap((i) => i)

  const rows: any[][] = []
  const replacements = new Map<string, { keyName: string; oldValue?: any; newValue?: any }>()

  changes.forEach((row) => {
    if (row.change !== OPERATION_TYPES.REPLACE) {
      rows.push([
        row.change,
        row.keyName,
        row.change === OPERATION_TYPES.DELETE ? row.value : '',
        row.change === OPERATION_TYPES.INSERT ? row.value : ''
      ])
      return
    }
    // fall back to keyName when the diff didn't supply a path, so unpaired halves still render
    const key = row.operation?.path || row.keyName
    const pair = replacements.get(key) ?? { keyName: row.keyName }
    if (row.operation?.newValue !== undefined) {
      pair.oldValue = row.value
    } else {
      pair.newValue = row.value
    }
    replacements.set(key, pair)
  })

  replacements.forEach(({ keyName, oldValue, newValue }) => {
    rows.push([OPERATION_TYPES.REPLACE, keyName, oldValue ?? '', newValue ?? ''])
  })

  return rows
}

// Merges the old and new data into a single object
const mergeChanges = (oldData: CollectedChangeMap, newData: CollectedChangeMap) => {
  const mergedData: CollectedChangeMap = {}
  const entries = Object.entries(oldData).length ? Object.entries(oldData) : Object.entries(newData)
  entries.forEach(([key, value]) => {
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
    ['Name', targetGrouperLibrary.title],
    ['Purpose', targetGrouperLibrary?.purpose],
    ['RCTC OID', getOid(targetGrouperLibrary)],
    ['RCTC Definition Version', targetGrouperLibrary?.version],
    ['RCTC Definition Effective Start Date', targetGrouperLibrary?.effectivePeriod?.start],
    ['RCTC Release Label', targetGrouperLibrary?.version]
  ])
  readmeSheet.addRow([]) // Add new line
  const previousVersionHeader = readmeSheet.addRow(['Previous Version'])
  previousVersionHeader.font = { bold: true }
  const previousVersion = readmeSheet.addRows([
    ['Name', sourceGrouperLibrary.title],
    ['Purpose', sourceGrouperLibrary?.purpose],
    ['RCTC OID', getOid(sourceGrouperLibrary)],
    ['RCTC Definition Version', sourceGrouperLibrary?.version],
    ['RCTC Definition Effective Start Date', sourceGrouperLibrary?.effectivePeriod?.start],
    ['RCTC Release Label', sourceGrouperLibrary?.version]
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
  const planDefRows = buildChangeRows(planDefData)
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
  const rctcRows = buildChangeRows(grouperLibDiff)

  if (rctcRows.length > 0) {
    const rctcTable = rctcSheet.addTable({
      name: 'rctcDiff',
      ref: `A${rctcInfoRows.length + 5}`,
      headerRow: true,
      style: {},
      columns: [
        { name: 'Change', filterButton: true },
        { name: 'Field Name', filterButton: true },
        { name: 'Old Value', filterButton: true },
        { name: 'New Value', filterButton: true }
      ],
      rows: rctcRows
    })

    autosortTable(rctcTable, rctcInfoRows, rctcSheet)
  }
}

const generateGrouperValuesetSheet = async (workbook: ExcelJS.Workbook, groupingValueSetsChangeLogs: any) => {
  await Promise.all(
    groupingValueSetsChangeLogs.map(async (page: any) => {
      const currentId = page.newData?.id?.value || page.oldData?.id?.value // use new ID unless it's a deleted grouper
      const currentVsVersion = page.newData?.version?.value || page.oldData?.version?.value
      // page.newData/oldData.id.value is not a real server-assigned resource id - look it up by canonical url/version instead
      const grouperVsSearch = await fetchByCanonical({
        client: FhirClient.getInstance(),
        resourceType: 'ValueSet',
        canonical: currentVsVersion ? `${page.url}|${currentVsVersion}` : page.url
      })
      const grouperVs = grouperVsSearch?.entry?.[0]?.resource as fhir4.ValueSet
      const groupingValueSetSheet: ExcelJS.Worksheet = workbook.addWorksheet(grouperVs?.name || grouperVs?.title)
      groupingValueSetSheet.getColumn('A').width = 30
      groupingValueSetSheet.getColumn('B').width = 60
      const vsInfo = [
        ['Value Set Name', page.newData?.title?.value],
        ['OID', grouperVs?.identifier?.[0]?.value?.replace('urn:oid:', '')],
        ['Type', 'Grouping'],
        ['Definition Version', grouperVs?.status],
        ['Steward', getVsSteward(grouperVs)],
        ['Author', getVsAuthor(grouperVs)],
        ['Publisher', grouperVs.publisher],
        ['Purpose', grouperVs.purpose],
        ['Description', grouperVs.description],
        ['Version', grouperVs.version],
        ['Priority', page.oldData?.priority?.value || page.newData?.priority?.value]
      ]
      groupingValueSetSheet.addRows(vsInfo)
      // Bold the headers
      vsInfo.forEach((row, index) => {
        const cell = groupingValueSetSheet.getCell(`A${index + 1}`)
        cell.font = { bold: true, color: { argb: 'FF0000FF' } }
      })

      // ValueSet CodeSystem Changes
      const groupingListRows: any[] = []

      const groupingTableStartRowCount = vsInfo.length + 3
      let groupingRowsAdded = 0 // Every grouping row shifts the Code List table start down
      const fillGroupingListTableRows = (data: any) => {
        Object.entries(data).forEach(([key, change]) => {
          // @ts-ignore todo: fix this
          change?.forEach((rowValue) => {
            const { conditions, memberOid, name, codeSystems, status, priority } = rowValue
            const vsCodeSystemName = codeSystems?.[0]?.name || ''
            const vsCodeSystemOid = codeSystems?.[0]?.oid || ''
            const pushGroupingRow = (condition?: any) => {
              groupingRowsAdded += 1
              groupingListRows.push([
                name,
                memberOid,
                priority?.value,
                vsCodeSystemName,
                vsCodeSystemOid,
                status,
                condition?.display ?? '',
                condition?.code ?? '',
                condition?.codeSystemName ?? '',
                condition?.version ?? '',
                key
              ])
            }
            if (conditions?.length) {
              conditions.forEach((condition: any) => pushGroupingRow(condition))
            } else {
              pushGroupingRow()
            }
          })
        })
      }
      // Page records a delete on oldData only and an insert on newData only, but a replace is on both
      // so merging the two sides emits a replaced leaf twice, under its old and its new name. Drop
      // only that duplicate half and leave every other change type to mergeChanges.
      const oldLeafChanges = collector(page.oldData?.leafValueSets)
      const newLeafChanges = collector(page.newData?.leafValueSets)
      const replacedOidsInNewData = new Set(
        (newLeafChanges[OPERATION_TYPES.REPLACE] ?? []).map((leaf: any) => leaf?.memberOid)
      )
      const oldLeafChangesWithoutDuplicateReplaces: CollectedChangeMap = {}
      Object.entries(oldLeafChanges).forEach(([change, leaves]) => {
        oldLeafChangesWithoutDuplicateReplaces[change] =
          change === OPERATION_TYPES.REPLACE
            ? (leaves?.filter((leaf: any) => !replacedOidsInNewData.has(leaf?.memberOid)) ?? [])
            : leaves
      })
      const leafValueSets = mergeChanges(oldLeafChangesWithoutDuplicateReplaces, newLeafChanges)
      fillGroupingListTableRows(leafValueSets)

      if (groupingListRows.length > 0) {
        const groungListTableTitle = groupingValueSetSheet.getCell(`A${groupingTableStartRowCount}`)
        groungListTableTitle.value = 'Grouping List'
        groungListTableTitle.font = { bold: true, color: { argb: 'FF0000FF' } }
        const groupingListTable = groupingValueSetSheet.addTable({
          name: toTableName('valueset_groupinglist', currentId),
          ref: `A${groupingTableStartRowCount + 1}`,
          headerRow: true,
          style: {},
          columns: [
            { name: 'Name' },
            { name: 'OID' },
            { name: 'Priority' },
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
            const { display: descriptor, memberOid, version, codeValue: code, codeSystemName } = rowValue
            const status = startCase(grouperVs?.status || '')
            const remapInfo = status === 'Active' ? 'No' : 'Yes'
            codeRows.push([memberOid, code, descriptor, codeSystemName, version, status, remapInfo, key])
          })
        })
      }
      const dataCodes = mergeChanges(collector(page.oldData?.codes), collector(page.newData?.codes))

      fillCodeRows(dataCodes)

      const codeRowsStartRowCount = groupingTableStartRowCount + groupingRowsAdded + 5
      if (codeRows.length > 0) {
        const tableTitle = groupingValueSetSheet.getCell(`A${codeRowsStartRowCount}`)
        tableTitle.value = 'Code List'
        tableTitle.font = { bold: true, color: { argb: 'FF0000FF' } }
        const table = groupingValueSetSheet.addTable({
          name: toTableName('valueset_codelist', currentId),
          ref: `A${codeRowsStartRowCount + 1}`,
          headerRow: true,
          style: {},
          columns: [
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
  buildChangeRows,
  mergeChanges,
  generatePlanDefSheet,
  generateRCTCSheet,
  generateReadMeSheet,
  generateGrouperValuesetSheet,
  autosortTable,
  changeLogDiffOperation,
  extractConditions
}
