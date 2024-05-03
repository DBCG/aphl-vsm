import ExcelJS from 'exceljs'
import {fhirCdrClient} from '@/fhirClients'
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

  const gatherNewValues = (artifact) => {
    Object.entries(artifact).forEach(([key, value]) => {
      if (typeof value === 'object') {
        if ('operation' in value) {
          operation[value.operation.type].push({ change: value.operation.type, ...value })
        } else {
          gatherNewValues(value)
        }
      }
    })
  }
  gatherNewValues(input)
  return operation
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<any> {

  if (is.string(req?.query?.id)) {
    try {
      const lib = (await fhirCdrClient.read({
        resourceType: 'Library',
        id: req.query.id as string
      })) as fhir4.Library
    }
  }


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

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Me'
  workbook.lastModifiedBy = 'Her'
  workbook.created = new Date(1985, 8, 30)
  workbook.modified = new Date()
  workbook.lastPrinted = new Date(2016, 9, 27)

  // Add a new sheet
  const readmeSheet = workbook.addWorksheet('Read Me')

  // Add column headers
  readmeSheet.columns = [{ header: 'New Conditions', key: 'newConditions', width: 10 }]

  // Add some rows
  newConditions.forEach((newConditions: string) => {
    readmeSheet.addRow({ newConditions })
  })

  const planDefinitionSheet = workbook.addWorksheet('Plan Definition')
  const rctcSheet = workbook.addWorksheet('Value Set Library')

  const groupingValueSetsChangeLogs = changeLogJson.pages.filter((page: any) => page.newData.resourceType === 'ValueSet')

  groupingValueSetsChangeLogs.forEach((page: any) => {
    const currentId = page.newData.id.value // Possibility that id has changed but we taking the new one for title
    const groupingValueSetSheet = workbook.addWorksheet(`${currentId} - ValueSet`)

    groupingValueSetSheet.columns = [
      { header: 'Change', key: 'change', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'OID', key: 'memberOid', width: 20 },
      { header: 'Version', key: 'version', width: 20 },
      { header: 'Code', key: 'code', width: 30 },
      { header: 'Code System', key: 'system', width: 10 }
    ]

    const oldData = collector(page.oldData.codes)
    const newData = collector(page.newData.codes)

    Object.entries(newData).forEach(([key, value]) => {
      value.forEach((rowValue) => {
        console.log(rowValue)
        const { change, display, version, system, code, memberOid } = rowValue
        groupingValueSetSheet.addRow({ change, name: display, memberOid, version, code, system })
      })
    })
  })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="Report.xlsx"')

  await workbook.xlsx.write(res)
  res.status(200).end()
}
