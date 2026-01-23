import { cloneDeep } from 'lodash'
import {
  getOID,
  convertBundleToCSVHelper
} from './convertBundleToCSVHelper'
import { uniq } from 'lodash'

const fixtureBundle = {
    resourceType: 'Bundle',
    entry: [
        {
            resource: {
                resourceType: 'Library',
                id: '1234',
                url: 'http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary',
                version: '1.0.0',
                name: 'SpecificationLibrary',
                title: 'Specification Library',
                status: 'active',
                experimental: false,
                publisher: 'Association of Public Health Laboratories (APHL)',
                description: 'Specification Library',
                effectivePeriod: { start: '2026-01-01'}
            }
        },
        {
            fullUrl: 'http://example.org/fhir/ValueSet/vs-sample-001',
            resource: {
                resourceType: 'ValueSet',
                id: 'vs100',
                name: 'sample value set 100',
                identifier: [
                    {
                        system: 'urn:ietf:rfc:3986',
                        value: 'urn:oid:1.23.456.7890'
                    }
                ],
                version: '1.0.0',
                status: 'active',
                date: '2026-01-01',
                purpose: 'test purpose',
                expansion: {
                    contains: [
                        {
                            system: 'http://www.ama-assn.org/go/cpt',
                            version: '1.0.0',
                            code: '1234',
                            display: 'test code 1'
                        },
                        {
                            system: 'http://loinc.org',
                            version: '1.0.0',
                            code: '5678',
                            display: 'test code 2'
                        }
                    ]
                }
            }
        },
        {
            fullUrl: 'http://example.org/fhir/ValueSet/vs-sample-002',
            resource: {
                resourceType: 'ValueSet',
                id: 'vs200',
                name: 'sample value set 200',
                identifier: [
                    {
                        system: 'urn:ietf:rfc:3986',
                        value: 'urn:oid:2.34.567.8901'
                    }
                ],
                version: '1.2.3',
                status: 'draft',
                date: '2026-02-02',
                expansion: {
                    contains: [
                        {
                            system: 'http://snomed.info/sct',
                            version: '2.3.4',
                            code: '4321',
                            display: 'test code 3'
                        },
                        {
                            system: 'http://hl7.org/fhir/sid/icd-10-cm',
                            version: '3.4.5',
                            code: '8765',
                            display: 'test code 4'
                        }
                    ]
                }
            }
        }
    ]
} as fhir4.Bundle

const fixtureBundleAsCsv = [
    '"Value Set Name","Value Set OID","Definition Version","Status","Purpose","Code","Display","Code System","Code System Version"',
    '"sample value set 100","1.23.456.7890","1.0.0","active","test purpose","1234","test code 1","http://www.ama-assn.org/go/cpt","1.0.0"',
    '"sample value set 100","1.23.456.7890","1.0.0","active","test purpose","5678","test code 2","http://loinc.org","1.0.0"',
    '"sample value set 200","2.34.567.8901","1.2.3","draft","","4321","test code 3","http://snomed.info/sct","2.3.4"',
    '"sample value set 200","2.34.567.8901","1.2.3","draft","","8765","test code 4","http://hl7.org/fhir/sid/icd-10-cm","3.4.5"'
].join('\n')

describe('get oid from urn', () => {
  it('should return an oid from a urn', () => {
    const identifier: fhir4.Identifier[] = [
        {
          value: 'urn:oid:2.16.840.1.113762.1.4.1146.106' 
        }
    ]
    const result = getOID(identifier)
    expect(result).toBe('2.16.840.1.113762.1.4.1146.106')
  })
})

describe('convertBundleToCSVHelper', () => {
    it('should return a csv', () => {
        const result = convertBundleToCSVHelper(fixtureBundle)
        expect(result).toBe(fixtureBundleAsCsv)
    })
})

