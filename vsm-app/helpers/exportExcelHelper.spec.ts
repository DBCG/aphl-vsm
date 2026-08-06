jest.mock('undici', () => ({ fetch: jest.fn(), Agent: jest.fn() }))

import { buildChangeRows, collector, mergeChanges } from './exportExcelHelper'

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
