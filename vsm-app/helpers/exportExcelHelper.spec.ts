jest.mock('undici', () => ({ fetch: jest.fn(), Agent: jest.fn() }))
// relative paths here: jest.config.js only maps the @/components and @/pages aliases
jest.mock('../backend/clients/FhirCdrClient', () => ({ __esModule: true, default: { getInstance: () => ({ baseUrl: 'http://test/fhir' }) } }))
jest.mock('./server/serverValueSetHelper', () => ({ fetchByCanonical: jest.fn() }))

import ExcelJS from 'exceljs'
import { fetchByCanonical } from './server/serverValueSetHelper'
import { buildChangeRows, collector, extractNewConditions, generateGrouperValuesetSheet, mergeChanges } from './exportExcelHelper'

// Shapes mirror a $create-changelog Library page: relatedArtifacts entries carry the canonical in
// `value`, and Page routes each operation type to oldData, newData, or (for replace) both.
const buildRows = (oldData: any, newData: any) => buildChangeRows(mergeChanges(collector(oldData), collector(newData)))

describe('buildChangeRows', () => {
  it('puts an inserted canonical in the New Value column only', () => {
    const rows = buildRows(
      { relatedArtifacts: [] },
      {
        relatedArtifacts: [
          {
            value: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.2.2',
            operation: { type: 'insert', path: 'relatedArtifact[6]', newValue: { type: 'depends-on' } }
          }
        ]
      }
    )

    expect(rows).toStrictEqual([
      ['insert', 'relatedArtifacts', '', 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.2.2']
    ])
  })

  it('puts a deleted canonical in the Old Value column only', () => {
    const rows = buildRows(
      {
        relatedArtifacts: [
          {
            value: 'http://ersd.aimsplatform.org/fhir/ValueSet/ostc|3.1.2',
            operation: { type: 'delete', path: 'relatedArtifact[2]', oldValue: { type: 'depends-on' } }
          }
        ]
      },
      { relatedArtifacts: [] }
    )

    expect(rows).toStrictEqual([
      ['delete', 'relatedArtifacts', 'http://ersd.aimsplatform.org/fhir/ValueSet/ostc|3.1.2', '']
    ])
  })

  // The case that was previously dropped entirely: a version bump is matched by url + type, so the
  // diff reports it as a replace rather than a delete/insert pair.
  // Note: Each side has its own canonical in `value` and a pointer to the OTHER side via the operation.
  // So the oldData half carries newValue and the newData half carries oldValue.
  it('pairs the two halves of a replace into a single old -> new row', () => {
    const path = 'relatedArtifact[0].resource'
    const rows = buildRows(
      {
        relatedArtifacts: [
          {
            value: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.1.2',
            operation: { type: 'replace', path, newValue: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.2.2' }
          }
        ]
      },
      {
        relatedArtifacts: [
          {
            value: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.2.2',
            operation: { type: 'replace', path, oldValue: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.1.2' }
          }
        ]
      }
    )

    expect(rows).toStrictEqual([
      [
        'replace',
        'relatedArtifacts',
        'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.1.2',
        'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|3.2.2'
      ]
    ])
  })

  it('still renders a replace when only one side is present', () => {
    const rows = buildRows(undefined, {
      relatedArtifacts: [
        {
          value: 'http://ersd.aimsplatform.org/fhir/ValueSet/lotc|3.2.2',
          operation: { type: 'replace', path: 'relatedArtifact[3].resource', oldValue: 'lotc|3.1.2' }
        }
      ]
    })

    expect(rows).toStrictEqual([
      ['replace', 'relatedArtifacts', '', 'http://ersd.aimsplatform.org/fhir/ValueSet/lotc|3.2.2']
    ])
  })

  it('keeps replaces on distinct paths as separate rows', () => {
    const rows = buildRows(
      {
        relatedArtifacts: [
          { value: 'a|1', operation: { type: 'replace', path: 'relatedArtifact[0].resource', newValue: 'a|2' } },
          { value: 'b|1', operation: { type: 'replace', path: 'relatedArtifact[1].resource', newValue: 'b|2' } }
        ]
      },
      {
        relatedArtifacts: [
          { value: 'a|2', operation: { type: 'replace', path: 'relatedArtifact[0].resource', oldValue: 'a|1' } },
          { value: 'b|2', operation: { type: 'replace', path: 'relatedArtifact[1].resource', oldValue: 'b|1' } }
        ]
      }
    )

    expect(rows).toStrictEqual([
      ['replace', 'relatedArtifacts', 'a|1', 'a|2'],
      ['replace', 'relatedArtifacts', 'b|1', 'b|2']
    ])
  })

  it('never emits raw JSON - only the canonical from value', () => {
    const rows = buildRows(
      { relatedArtifacts: [] },
      {
        relatedArtifacts: [
          {
            value: 'http://ersd.aimsplatform.org/fhir/ValueSet/mrtc|3.2.2',
            // operation.newValue holds the whole element, which would serialise to raw JSON
            operation: {
              type: 'insert',
              path: 'relatedArtifact[9]',
              newValue: { type: 'depends-on', display: 'ValueSet Medications Triggers', resource: 'mrtc|3.2.2' }
            }
          }
        ]
      }
    )

    rows.flat().forEach((cell) => expect(typeof cell === 'string' || cell === '').toBe(true))
  })
})

describe('generateGrouperValuesetSheet', () => {
  const grouperVs = {
    resourceType: 'ValueSet',
    name: 'DiagnosisProblemTriggers',
    status: 'active',
    version: '3.6.2',
    publisher: 'CSTE Steward',
    purpose: 'Diagnoses or problems documented in a clinical record.',
    description: 'Purpose: Clinical Focus',
    identifier: [{ value: 'urn:oid:2.16.840.1.113762.1.4.1146.627' }]
  }

  // A repinned leaf: the grouper's compose reference moved to a new version. The leaf itself
  // carries the replace and has no conditions, which used to emit no rows at all.
  // Page records a replace on BOTH sides, so oldData carries the same leaf under its old name.
  const pageWithRepinnedLeaf = (conditions: any[]) => ({
    resourceType: 'ValueSet',
    url: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc',
    oldData: {
      resourceType: 'ValueSet',
      id: { value: '10' },
      version: { value: '3.6.1' },
      title: { value: 'Diagnosis_Problem Triggers for Public Health Reporting' },
      leafValueSets: [
        {
          name: 'Diptheria Disorders',
          memberOid: '2.16.840.1.113762.1.4.1146.6',
          status: 'active',
          priority: { value: 'routine' },
          codeSystems: [{ name: 'SNOMEDCT', oid: '2.16.840.1.113883.6.96' }],
          conditions,
          operation: { type: 'replace', path: 'ValueSet.compose.include[0].valueSet[0]', newValue: 'dxtc|3.6.2' }
        }
      ],
      codes: []
    },
    newData: {
      resourceType: 'ValueSet',
      id: { value: '10' },
      version: { value: '3.6.2' },
      title: { value: 'Diagnosis_Problem Triggers for Public Health Reporting' },
      leafValueSets: [
        {
          // renamed between versions, as VSAC content does - lets the assertions tell the sides apart
          name: 'DiphtheriaDisordersSNOMED',
          memberOid: '2.16.840.1.113762.1.4.1146.6',
          status: 'active',
          priority: { value: 'routine' },
          codeSystems: [{ name: 'SNOMEDCT', oid: '2.16.840.1.113883.6.96' }],
          conditions,
          operation: { type: 'replace', path: 'ValueSet.compose.include[0].valueSet[0]' }
        }
      ],
      codes: []
    }
  })

  const buildSheet = async (conditions: any[]) => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [pageWithRepinnedLeaf(conditions)])
    return workbook.getWorksheet(grouperVs.name)!
  }

  const groupingRows = (sheet: ExcelJS.Worksheet) => {
    const rows: any[][] = []
    sheet.eachRow((row) => {
      const values = (row.values as any[]).slice(1)
      if (values[1] === '2.16.840.1.113762.1.4.1146.6') { rows.push(values) }
    })
    return rows
  }

  it('emits a Grouping List row for a leaf that changed but has no conditions', async () => {
    const sheet = await buildSheet([])
    const titles: string[] = []
    sheet.eachRow((row) => { const v = (row.values as any[])[1]; if (typeof v === 'string') titles.push(v) })

    expect(titles).toContain('Grouping List')
    const rows = groupingRows(sheet)
    // one row for the leaf, not one per side of the replace
    expect(rows).toHaveLength(1)
    // the Change column is last, and blank condition columns sit before it
    expect(rows[0][rows[0].length - 1]).toBe('replace')
    // newData's name, matching what the Value Sets table shows on screen
    expect(rows[0][0]).toBe('DiphtheriaDisordersSNOMED')
  })

  // The same OID can carry different change types on each side e.g. a reordering diff emits a
  // delete at one index and an insert at another. Only a replace is recorded on both sides, so
  // only a replace may be collapsed; anything else has to survive the merge.
  it('keeps both sides when the same OID has different old and new change types', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf([])
    page.oldData.leafValueSets[0].operation = { type: 'delete', path: 'ValueSet.compose.include[0].valueSet[0]' }
    page.newData.leafValueSets[0].operation = { type: 'insert', path: 'ValueSet.compose.include[0].valueSet[3]' }

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r[r.length - 1]).sort()).toStrictEqual(['delete', 'insert'])
  })

  it('keeps a leaf that only exists in oldData, so removals are not lost', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf([])
    page.newData.leafValueSets = []
    page.oldData.leafValueSets[0].operation = { type: 'delete', path: 'ValueSet.compose.include[0].valueSet[0]' }

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toHaveLength(1)
    expect(rows[0][0]).toBe('Diptheria Disorders')
    expect(rows[0][rows[0].length - 1]).toBe('delete')
  })

  it('still emits one row per condition when the leaf has them', async () => {
    const sheet = await buildSheet([
      { code: '840539006', display: 'COVID-19', system: 'http://snomed.info/sct', codeSystemName: 'SNOMEDCT', version: '2025-09' },
      { code: '27836007', display: 'Pertussis', system: 'http://snomed.info/sct', codeSystemName: 'SNOMEDCT', version: '2025-09' }
    ])

    const rows = groupingRows(sheet)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r[6])).toStrictEqual(['COVID-19', 'Pertussis'])
    rows.forEach((r) => expect(r[r.length - 1]).toBe('replace'))
  })
})

describe('extractNewConditions', () => {
  // Shape taken from a real program manifest: conditions are crmi-intendedUsageContext extensions with
  // a `focus` code on the relatedArtifact entries. The changelog's own conditions arrays are empty, so
  // reading those reported nothing at all => read the Library resources instead.
  const dependsOn = (canonical: string, ...conditions: { code: string; text: string }[]) => ({
    type: 'depends-on',
    resource: canonical,
    extension: [
      // a priority usage context sits alongside the conditions and must be ignored
      {
        url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
        valueUsageContext: {
          code: { system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type', code: 'priority' },
          valueCodeableConcept: { coding: [{ code: 'routine' }] }
        }
      },
      ...conditions.map(({ code, text }) => ({
        url: 'http://hl7.org/fhir/uv/crmi/StructureDefinition/crmi-intendedUsageContext',
        valueUsageContext: {
          code: { system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type', code: 'focus' },
          valueCodeableConcept: { coding: [{ system: 'http://snomed.info/sct', code }], text }
        }
      }))
    ]
  })
  const manifest = (...entries: any[]) => ({ resourceType: 'Library', relatedArtifact: entries } as unknown as fhir4.Library)

  const RSV_OLD = { code: '55735004', text: 'Respiratory syncytial virus infection (disorder)' }
  const RSV_NEW = { code: '761671000124100', text: 'Death associated with respiratory syncytial virus infection (event)' }

  it('reports only conditions the source manifest does not declare', () => {
    const source = manifest(dependsOn('a|1', RSV_OLD))
    const target = manifest(dependsOn('a|1', RSV_OLD), dependsOn('b|1', RSV_NEW))

    expect(extractNewConditions(source, target)).toStrictEqual([RSV_NEW.text])
  })

  // The original bug: conditions of newly added value sets were reported as new conditions.
  it('does not report an existing condition just because a value set carrying it was added', () => {
    const existing = { code: '406575008', text: 'Infection caused by vancomycin resistant Enterococcus (disorder)' }
    const source = manifest(dependsOn('a|1', existing))
    const target = manifest(dependsOn('a|1', existing), dependsOn('b|1', existing))

    expect(extractNewConditions(source, target)).toStrictEqual([])
  })

  it('treats a re-worded display as the same condition', () => {
    const source = manifest(dependsOn('a|1', { code: '74351001', text: "Reye's syndrome (disorder)" }))
    const target = manifest(dependsOn('a|1', { code: '74351001', text: "Reye's Syndrome (disorder)" }))

    expect(extractNewConditions(source, target)).toStrictEqual([])
  })

  it('ignores non-focus usage contexts such as priority', () => {
    expect(extractNewConditions(manifest(), manifest(dependsOn('a|1')))).toStrictEqual([])
  })

  it('reports everything when there is no source manifest', () => {
    expect(extractNewConditions(undefined, manifest(dependsOn('a|1', RSV_NEW)))).toStrictEqual([RSV_NEW.text])
  })
})
