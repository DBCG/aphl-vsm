import { createTableData } from './createTables'
import { changelog } from './sample_changelog'

describe('createTableData', () => {
  it('should build the expected structure for root lib', () => {
    // @ts-ignore
    const result = createTableData(changelog)
    const expectedRootLib = {
      id: [ undefined, '7' ],
      name: [ undefined, undefined ],
      version: [ '2022-10-19', '1.0.0.0-draft' ],
      purpose: [ 'SpecificationLibrary', undefined ],
      effectiveStart: [ undefined, undefined ],
      releaseDate: [ undefined, undefined ],
      codeSystems: null
    }

    // @ts-ignore
    expect(result.rootLibrary).toStrictEqual(expectedRootLib)
  })

  it('should build the expected structure for grouper data', () => {
    // @ts-ignore
    const result = createTableData(changelog)
    const expectedGrouperData = [
      {
        metadata: {
          isDeleted: false,
          isNew: false,
          hasChanges: true,
          codeSystems: [ 'http://snomed.info/sct' ],
          id: '10',
          title: undefined,
          version: '1.0.0.0-draft'
        },
        valueSetsTable: [],
        codeSystemsTable: [
        {
          change: '',
          oid: '123-this-will-be-routine',
          code: '772155008',
          descriptor: 'Acute poliomyelitis suspected (situation)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-01-10',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '1193749009',
          descriptor: 'Inflammation of small intestine caused by Vibrio cholerae (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '1193750009',
          descriptor: 'Inflammation of intestine caused by Vibrio cholerae (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '240349003',
          descriptor: 'Cholera caused by Vibrio cholerae O1 Classical biotype (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '240350003',
          descriptor: 'Cholera - non-O1 group vibrio (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '240351004',
          descriptor: 'Cholera - O139 group Vibrio cholerae (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '447282003',
          descriptor: 'Intestinal infection caused by Vibrio cholerae O1 (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '63650001',
          descriptor: 'Cholera (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'insert',
          oid: '2.16.840.1.113762.1.4.1146.163',
          code: '81020007',
          descriptor: 'Cholera caused by Vibrio cholerae El Tor (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: '',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '1086051000119107',
          descriptor: 'Cardiomyopathy due to diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '1086061000119109',
          descriptor: 'Diphtheria radiculomyelitis (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '1086071000119103',
          descriptor: 'Diphtheria tubulointerstitial nephropathy (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '1090211000119102',
          descriptor: 'Pharyngeal diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '129667001',
          descriptor: 'Diphtheritic peripheral neuritis (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '13596001',
          descriptor: 'Diphtheritic peritonitis (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '15682004',
          descriptor: 'Anterior nasal diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '186347006',
          descriptor: 'Diphtheria of penis (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '18901009',
          descriptor: 'Cutaneous diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '194945009',
          descriptor: 'Acute myocarditis - diphtheritic (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '230596007',
          descriptor: 'Diphtheritic neuropathy (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '240422004',
          descriptor: 'Tracheobronchial diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '26117009',
          descriptor: 'Diphtheritic myocarditis (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '276197005',
          descriptor: 'Infection caused by Corynebacterium diphtheriae (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '3419005',
          descriptor: 'Faucial diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '397428000',
          descriptor: 'Diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '397430003',
          descriptor: 'Diphtheria caused by Corynebacterium diphtheriae (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '48278001',
          descriptor: 'Diphtheritic cystitis (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '50215002',
          descriptor: 'Laryngeal diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '715659006',
          descriptor: 'Diphtheria of respiratory system (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '75589004',
          descriptor: 'Nasopharyngeal diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '7773002',
          descriptor: 'Conjunctival diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        },
        {
          change: 'Deleted',
          oid: '2.16.840.1.113762.1.4.1146.6',
          code: '789005009',
          descriptor: 'Paralysis of uvula after diphtheria (disorder)',
          codeSystem: 'http://snomed.info/sct',
          codeSystemVersion: 'Provisional_2022-04-25',
          codeSystemOID: ''
        }
        ],
        groupIndex: 0,
        isDeleted: false,
        isNew: false,
        hasChanges: true
      }
    ]
    // @ts-ignoregst
    expect(result.grouperPages).toStrictEqual(expectedGrouperData)
  })

})