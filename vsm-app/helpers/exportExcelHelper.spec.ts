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

  // The same OID can carry different change types on each side: a reordering diff emits a delete at
  // one index and an insert at another for a leaf that never left the grouper. This used to assert
  // both halves survived as separate rows, which reported one leaf as both removed and added.
  it('reports one row for a leaf whose OID carries a different change on each side', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf([])
    page.oldData.leafValueSets[0].operation = { type: 'delete', path: 'ValueSet.compose.include[0].valueSet[0]' }
    page.newData.leafValueSets[0].operation = { type: 'insert', path: 'ValueSet.compose.include[0].valueSet[3]' }

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toHaveLength(1)
    expect(rows[0][rows[0].length - 1]).toBe('insert')
  })

  it('prefers the leaf title over the name in the Grouping List', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf([])
    page.oldData.leafValueSets[0].title = 'Diphtheria Disorders (SNOMED)'
    page.newData.leafValueSets[0].title = 'Diphtheria Disorders (SNOMED)'

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toHaveLength(1)
    expect(rows[0][0]).toBe('Diphtheria Disorders (SNOMED)')
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

  // Shape taken from the changelog JSON: a condition is a ValueSetChild.Code, so its code is
  // serialised as `codeValue`.
  const conditions = [
    { codeValue: '840539006', display: 'COVID-19', system: 'http://snomed.info/sct', codeSystemName: 'SNOMEDCT' },
    { codeValue: '27836007', display: 'Pertussis', system: 'http://snomed.info/sct', codeSystemName: 'SNOMEDCT' }
  ]

  it('still emits one row per condition when the leaf has them', async () => {
    const sheet = await buildSheet(conditions)

    const rows = groupingRows(sheet)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r[6])).toStrictEqual(['COVID-19', 'Pertussis'])
    rows.forEach((r) => expect(r[r.length - 1]).toBe('replace'))
  })
  
  it('reads a condition code from codeValue, which is what the changelog carries', async () => {
    const rows = groupingRows(await buildSheet(conditions))

    expect(rows.map((r) => r[7])).toStrictEqual(['840539006', '27836007'])
    expect(rows.map((r) => r[8])).toStrictEqual(['SNOMEDCT', 'SNOMEDCT'])
  })

  // Every row in the table, not only the ones a leaf OID matches, so a row built from something
  // other than a leaf cannot hide from this.
  const allGroupingRows = (sheet: ExcelJS.Worksheet) => {
    const rows: any[][] = []
    let inTable = false
    sheet.eachRow((row) => {
      const values = (row.values as any[]).slice(1)
      if (values[0] === 'Grouping List') { inTable = true; return }
      if (values[0] === 'Name' && values[1] === 'OID') { return } // header
      if (values[0] === 'Code List') { inTable = false; return }
      if (inTable) { rows.push(values) }
    })
    return rows
  }

  // Collector walked into any leaf without an `operation` key and into any leaf carrying a replace.
  // A marked condition and a marked priority each satisfied its "renderable change" test, so both were collected as
  // rows of their own and rendered with no Name, OID, Code System, Status or Priority.
  it('never emits a row that is blank except for the Change column', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const marked = { type: 'insert', path: 'condition' }
    const page: any = pageWithRepinnedLeaf([{ ...conditions[0], operation: marked }])
    page.newData.leafValueSets[0].priority = { value: 'emergent', operation: { type: 'replace', path: 'priority' } }
    // a second leaf that is otherwise untouched
    page.newData.leafValueSets.push({
      name: 'Pertussis Disorders',
      memberOid: '2.16.840.1.113762.1.4.1146.7',
      status: 'active',
      priority: { value: 'routine', operation: { type: 'replace', path: 'priority' } },
      codeSystems: [{ name: 'SNOMEDCT', oid: '2.16.840.1.113883.6.96' }],
      conditions: [{ ...conditions[1], operation: marked }]
    })

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = allGroupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((row) => {
      expect(row[0]).toBeTruthy() // Name
      expect(row[1]).toBeTruthy() // OID
    })
  })

  it('keeps a leaf whose only change is a condition', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf([{ ...conditions[0], operation: { type: 'insert', path: 'condition' } }])
    delete page.oldData.leafValueSets[0].operation
    delete page.newData.leafValueSets[0].operation
    page.oldData.leafValueSets[0].conditions = []

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toHaveLength(1)
    expect(rows[0][6]).toBe('COVID-19')
    // a condition reports in the same words the Value Sets table uses, not the raw operation type
    expect(rows[0][rows[0].length - 1]).toBe('Add condition')
  })

  // A condition the new release dropped is marked on oldData only, so reading the new side alone
  // would lose both the row and the condition's detail columns.
  it('reports a condition removed from a leaf that survived', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf([])
    delete page.oldData.leafValueSets[0].operation
    delete page.newData.leafValueSets[0].operation
    page.oldData.leafValueSets[0].conditions = [{ ...conditions[0], operation: { type: 'delete', path: 'condition' } }]
    page.newData.leafValueSets[0].conditions = []

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toHaveLength(1)
    expect(rows[0][6]).toBe('COVID-19')
    expect(rows[0][rows[0].length - 1]).toBe('Remove condition')
  })

  // The Change column is per row, so a condition that moved reports its own change rather than
  // inheriting the leaf's. Otherwise a repinned leaf reports every one of its conditions as
  // "replace", including the one that was actually added.
  it('gives a moved condition its own change and the rest the leafs', async () => {
    const sheet = await buildSheet([{ ...conditions[0], operation: { type: 'insert', path: 'condition' } }, conditions[1]])
    const rows = groupingRows(sheet)

    expect(rows.map((r) => [r[6], r[r.length - 1]])).toStrictEqual([
      ['COVID-19', 'Add condition'],
      ['Pertussis', 'replace']
    ])
  })

  // A priority change is the leaf's own, so every row for that leaf reports it - but as words, not
  // as its operation type, which is always `replace` and so read identically to a repinned leaf.
  it('words a priority change rather than reporting it as a replace', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf(conditions)
    delete page.oldData.leafValueSets[0].operation
    delete page.newData.leafValueSets[0].operation
    page.newData.leafValueSets[0].priority = { value: 'emergent', operation: { type: 'replace', path: 'priority' } }

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows.map((r) => r[r.length - 1])).toStrictEqual(['Updated priority', 'Updated priority'])
  })


  it('emits no rows for a leaf nothing changed on', async () => {
    ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
    const page: any = pageWithRepinnedLeaf(conditions)
    delete page.oldData.leafValueSets[0].operation
    delete page.newData.leafValueSets[0].operation

    const workbook = new ExcelJS.Workbook()
    await generateGrouperValuesetSheet(workbook, [page])
    const rows = groupingRows(workbook.getWorksheet(grouperVs.name)!)

    expect(rows).toStrictEqual([])
  })

  // The Code List Status column used to print the grouper's status. It now comes from the code's own
  // `inactive`, which the changelog carries per side off expansion.contains.
  describe('Code List Status', () => {
    const code = (codeValue: string, inactive?: boolean) => ({
      codeValue,
      display: 'Diphtheria',
      memberOid: '2.16.840.1.113762.1.4.1146.422',
      codeSystemName: 'SNOMEDCT',
      version: '2026-03',
      ...(inactive === undefined ? {} : { inactive }),
      operation: { type: 'insert', path: 'ValueSet.expansion.contains[0]' }
    })

    const pageWithCodes = (codes: any[]) => ({
      resourceType: 'ValueSet',
      url: 'http://ersd.aimsplatform.org/fhir/ValueSet/dxtc',
      oldData: {
        resourceType: 'ValueSet',
        id: { value: '10' },
        version: { value: '3.6.1' },
        title: { value: 'Diagnosis_Problem Triggers for Public Health Reporting' },
        leafValueSets: [],
        codes: []
      },
      newData: {
        resourceType: 'ValueSet',
        id: { value: '10' },
        version: { value: '3.6.2' },
        title: { value: 'Diagnosis_Problem Triggers for Public Health Reporting' },
        leafValueSets: [],
        codes
      }
    })

    // Code List columns: Member OID, Code, Descriptor, Code System, Version, Status, RemapInfo, Change
    const STATUS = 5

    const statusFor = async (codes: any[]) => {
      ;(fetchByCanonical as jest.Mock).mockResolvedValue({ entry: [{ resource: grouperVs }] })
      const workbook = new ExcelJS.Workbook()
      await generateGrouperValuesetSheet(workbook, [pageWithCodes(codes)])
      const sheet = workbook.getWorksheet(grouperVs.name)!
      const byCode: Record<string, any> = {}
      sheet.eachRow((row) => {
        const values = (row.values as any[]).slice(1)
        if (values[0] === '2.16.840.1.113762.1.4.1146.422') {
          byCode[values[1]] = values[STATUS]
        }
      })
      return byCode
    }

    it('reads Inactive from the code', async () => {
      expect(await statusFor([code('13570003', true)])).toStrictEqual({ '13570003': 'Inactive' })
    })

    it('reads Active when the code is not retired', async () => {
      expect(await statusFor([code('14188007', false)])).toStrictEqual({ '14188007': 'Active' })
    })

    it('leaves the status blank when the changelog states none', async () => {
      expect(await statusFor([code('23022004')])).toStrictEqual({ '23022004': '' })
    })

    it('reports each code its own status within one grouper', async () => {
      expect(await statusFor([code('13570003', true), code('14188007', false), code('23022004')])).toStrictEqual({
        '13570003': 'Inactive',
        '14188007': 'Active',
        '23022004': ''
      })
    })
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
