import  ExcelJS from 'exceljs';
import type { NextApiRequest, NextApiResponse } from 'next'
import changeLogJson from '../../test_fixtures/change-log-response.json'

const OPERATION_TYPES = {
 INSERT: 'insert',
 REPLACE: 'replace',
}

// Go to newData
// recursive search for "operation"
// if found in the case of replace
// use path parameter against the root (aka most parent object) to get the new value, and use oldValue set in the operation for the old value


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {

  let newConditions;

  changeLogJson.pages[0].newData.relatedArtifacts.forEach((artifact: any) => {
    // Handles case of new conditions being added
    if ("operation" in artifact) {
      if (artifact.operation.type === OPERATION_TYPES.INSERT && "extension" in artifact.operation.newValue) {
        newConditions = artifact.operation.newValue.extension.map((extension: any) => {
          if (extension.url === "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition") {
            return extension.valueCodeableConcept.text 
          }
        }).filter(i => i)
      }
    }

    /// TODO: What about handling the case of condition changes?
    // artifact.conditions.forEach((condition: any) => {
    //   if ("operation" in condition)
    // })
  })


  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Me';
  workbook.lastModifiedBy = 'Her';
  workbook.created = new Date(1985, 8, 30);
  workbook.modified = new Date();
  workbook.lastPrinted = new Date(2016, 9, 27);

  // Add a new sheet
  const readmeSheet = workbook.addWorksheet('Read Me');

  // Add column headers
  readmeSheet.columns = [
    { header: 'New Conditions', key: 'newConditions', width: 10 },
  ];

  // Add some rows
  newConditions.forEach((newConditions: string) => {
    readmeSheet.addRow({ newConditions });
  })


  const planDefinitionSheet = workbook.addWorksheet('Plan Definition');
  const rctcSheet = workbook.addWorksheet('Value Set Library');


  const groupingValueSetsChangeLogs = changeLogJson.pages.filter((page: any) => page.newData.resourceType === "ValueSet")

  groupingValueSetsChangeLogs.forEach((page: any) => {
    const currentId = page.newData.id.value // Possibility that id has changed but we taking the new one for title
    const groupingValueSetSheet = workbook.addWorksheet(`${currentId} - ValueSet`);
  })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Report.xlsx"');

  await workbook.xlsx.write(res);
  res.status(200).end();
}



