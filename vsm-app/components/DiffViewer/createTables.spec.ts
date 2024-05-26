import { createTableData } from './createTables'
import { changelog } from './changelog'

describe('createTableData', () => {
  it('should build the expected structure for root lib', () => {
    const result = createTableData(changelog)
    const expectedRootLib = {
      'id': [undefined, '7'],
      'name': [undefined, undefined],
      'version': ['2022-10-19', '1.0.0.0-draft'],
      'purpose': ['SpecificationLibrary', undefined],
      'effectiveStart': [undefined, undefined],
      'releaseDate': [undefined, undefined]
    }

    expect(result.rootLibrary).toStrictEqual(expectedRootLib)
  })

  it('should build the expected structure for grouper data', () => {
    const result = createTableData(changelog)
    const expectedGrouperData = [{
      metadata: {
        id: "10", title: undefined, version: "1.0.0.0-draft", codeSystems: ["http://snomed.info/sct"]
      },
      valueSetsTable: [
        {
          oid: "123-this-will-be-routine",
          change: "Update Conditions",
          conditionUpdates: [
            { operation: "Replace condition code 49649001 with 767146004", conditionName: undefined, codeSystemVersion: undefined, conditionCode: "767146004", conditionSystem: "http://snomed.info/sct" },
            { operation: "Add condition", conditionName: undefined, codeSystemVersion: undefined, conditionCode: "49649001", conditionSystem: "http://snomed.info/sct" }
          ]
        },
        { oid: "2.16.840.1.113762.1.4.1146.163",
        change: "Added VS",
        conditionUpdates: [{ operation: undefined, conditionName: undefined, codeSystemVersion: undefined, conditionSystem: "http://snomed.info/sct", conditionCode: "123123123" }]
      }],
        codeSystemsTable: [
          // this top item has NO CHANGE
          { change: undefined, oid: "123-this-will-be-routine", code: "772155008", descriptor: "Acute poliomyelitis suspected (situation)", codeSystem: "http://snomed.info/sct", codeSystemVersion: "Provisional_2022-01-10" },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "1193749009", descriptor: "Inflammation of small intestine caused by Vibrio cholerae (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "1193750009", descriptor: "Inflammation of intestine caused by Vibrio cholerae (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "240349003", descriptor: "Cholera caused by Vibrio cholerae O1 Classical biotype (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "240350003", descriptor: "Cholera - non-O1 group vibrio (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "240351004", descriptor: "Cholera - O139 group Vibrio cholerae (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "447282003", descriptor: "Intestinal infection caused by Vibrio cholerae O1 (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "63650001", descriptor: "Cholera (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined },
          { change: "insert", oid: "2.16.840.1.113762.1.4.1146.163", code: "81020007", descriptor: "Cholera caused by Vibrio cholerae El Tor (disorder)", codeSystem: "http://snomed.info/sct", codeSystemVersion: undefined }
        ]
    }]
    console.log('test: ', JSON.stringify(result.grouperPages))
    expect(result.grouperPages).toStrictEqual(expectedGrouperData)
  })

  it
})