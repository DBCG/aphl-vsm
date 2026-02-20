import { is } from './is'

describe('is.isVSP', () => {
  const makeVSPLibrary = (overrides: any = {}): fhir4.Library => ({
    resourceType: 'Library',
    id: 'test-vsp',
    status: 'draft',
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/library-type',
        code: 'asset-collection'
      }]
    },
    useContext: [{
      code: {
        system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
        code: 'specification-type'
      },
      valueCodeableConcept: {
        coding: [{
          system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
          code: 'value-set-package'
        }]
      }
    }],
    ...overrides
  })

  it('should return true for a valid VSP Library', () => {
    expect(is.isVSP(makeVSPLibrary())).toBe(true)
  })

  it('should return false when type is not asset-collection', () => {
    const lib = makeVSPLibrary({
      type: { coding: [{ code: 'logic-library' }] }
    })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return false when useContext code is not specification-type', () => {
    const lib = makeVSPLibrary({
      useContext: [{
        code: { code: 'other-type' },
        valueCodeableConcept: {
          coding: [{ code: 'value-set-package' }]
        }
      }]
    })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return false when useContext value is "program" (a Program Library)', () => {
    const lib = makeVSPLibrary({
      useContext: [{
        code: { code: 'specification-type' },
        valueCodeableConcept: {
          coding: [{ code: 'program' }]
        }
      }]
    })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return false when useContext is missing', () => {
    const lib = makeVSPLibrary({ useContext: undefined })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return false when useContext is empty array', () => {
    const lib = makeVSPLibrary({ useContext: [] })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return false for undefined input', () => {
    expect(is.isVSP(undefined)).toBe(false)
  })

  it('should return false for null input', () => {
    expect(is.isVSP(null)).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(is.isVSP({})).toBe(false)
  })

  it('should return false when type is missing', () => {
    const lib = makeVSPLibrary({ type: undefined })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return false when coding array is empty', () => {
    const lib = makeVSPLibrary({
      type: { coding: [] }
    })
    expect(is.isVSP(lib)).toBe(false)
  })

  it('should return true when multiple useContext entries exist and one is value-set-package', () => {
    const lib = makeVSPLibrary({
      useContext: [
        {
          code: { code: 'other-context' },
          valueCodeableConcept: { coding: [{ code: 'other-value' }] }
        },
        {
          code: { code: 'specification-type' },
          valueCodeableConcept: { coding: [{ code: 'value-set-package' }] }
        }
      ]
    })
    expect(is.isVSP(lib)).toBe(true)
  })
})
