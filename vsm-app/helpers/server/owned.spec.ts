import FhirClient from '@/backend/clients/FhirCdrClient'
import updateOwnedResources from './owned'

jest.mock('fhir-kit-client')

describe('updateOwnedResources', () => {
  it('should update owned resources', async () => {
    const programId = '1418'
    const programVersion = '1'
    const isExperimental = true

    FhirClient.getInstance().transaction = jest.fn().mockResolvedValueOnce(fixture)

    await updateOwnedResources({ programId, programVersion, isExperimental })
    expect(FhirClient.getInstance().transaction).toHaveBeenCalledWith({
      body: {
        entry: [
          {
            request: {
              method: 'GET',
              url: 'ValueSet?version=1'
            }
          },
          {
            request: {
              method: 'GET',
              url: 'PlanDefinition?version=1'
            }
          },
          {
            request: {
              method: 'GET',
              url: 'Library?version=1'
            }
          }
        ],
        resourceType: 'Bundle',
        type: 'transaction'
      }
    })

    expect(FhirClient.getInstance().transaction).toHaveBeenLastCalledWith({
      body: {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: { id: '1421', resourceType: 'ValueSet', url: 'http://hl7.org/fhir/us/ecr/ValueSet/dxtc', experimental: true },
            request: { method: 'PUT', url: '/ValueSet/1421' }
          },
          {
            resource: { id: '1422', resourceType: 'ValueSet', url: 'http://hl7.org/fhir/us/ecr/ValueSet/ostc', experimental: true },
            request: { method: 'PUT', url: '/ValueSet/1422' }
          },
          {
            resource: { id: '1423', resourceType: 'ValueSet', url: 'http://hl7.org/fhir/us/ecr/ValueSet/lotc', experimental: true },
            request: { method: 'PUT', url: '/ValueSet/1423' }
          },
          {
            resource: { id: '1424', resourceType: 'ValueSet', url: 'http://hl7.org/fhir/us/ecr/ValueSet/lrtc', experimental: true },
            request: { method: 'PUT', url: '/ValueSet/1424' }
          },
          {
            resource: { id: '1425', resourceType: 'ValueSet', url: 'http://hl7.org/fhir/us/ecr/ValueSet/mrtc', experimental: true },
            request: { method: 'PUT', url: '/ValueSet/1425' }
          },
          {
            resource: { id: '1426', resourceType: 'ValueSet', url: 'http://hl7.org/fhir/us/ecr/ValueSet/sdtc', experimental: true },
            request: { method: 'PUT', url: '/ValueSet/1426' }
          },
          {
            resource: {
              id: '1419',
              resourceType: 'PlanDefinition',
              url: 'http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-instance-example',
              experimental: true,
              relatedArtifact: [
                {
                  type: 'depends-on',
                  label: 'RCTC Value Set Library of Trigger Codes',
                  resource: 'http://hl7.org/fhir/us/ecr/Library/library-rctc-example|1.9.0.0-draft'
                },
                { type: 'composed-of', resource: 'http://notOwnedTest.com/Library/notOwnedLeaf|0.1.1' }
              ]
            },
            request: { method: 'PUT', url: '/PlanDefinition/1419' }
          },
          {
            resource: {
              id: '1420',
              resourceType: 'Library',
              url: 'http://hl7.org/fhir/us/ecr/Library/library-rctc-example',
              experimental: true,
              relatedArtifact: [
                {
                  extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/dxtc|1.9.0.0-draft'
                },
                {
                  extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/ostc|1.9.0.0-draft'
                },
                {
                  extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/lotc|1.9.0.0-draft'
                },
                {
                  extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/lrtc|1.9.0.0-draft'
                },
                {
                  extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/mrtc|1.9.0.0-draft'
                },
                {
                  extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/sdtc|1.9.0.0-draft'
                },
                { type: 'composed-of', resource: 'http://notOwnedTest.com/Library/notOwnedLeaf1|0.1.1' }
              ]
            },
            request: { method: 'PUT', url: '/Library/1420' }
          }
        ]
      }
    })
  })
})

// This is a stripped down version of what the original input would be to test
const fixture = {
  resourceType: 'Bundle',
  id: '023d0559-7cea-497a-9ab7-34d4a74405d9',
  type: 'transaction-response',
  link: [
    {
      relation: 'self',
      url: 'http://localhost:8082/fhir'
    }
  ],
  entry: [
    {
      resource: {
        resourceType: 'Bundle',
        id: 'eee01542-9c6c-4b49-a6df-5ae27118a0df',
        meta: {
          lastUpdated: '2024-02-06T19:38:46.035+00:00'
        },
        type: 'searchset',
        total: 6,
        link: [
          {
            relation: 'self',
            url: 'http://localhost:8082/fhir/ValueSet?version=1.9.0.0-draft'
          }
        ],
        entry: [
          {
            fullUrl: 'http://localhost:8082/fhir/ValueSet/1421',
            resource: {
              id: '1421',
              resourceType: 'ValueSet',
              url: 'http://hl7.org/fhir/us/ecr/ValueSet/dxtc',
              experimental: false
            },
            search: {
              mode: 'match'
            }
          },
          {
            fullUrl: 'http://localhost:8082/fhir/ValueSet/1422',
            resource: {
              id: '1422',
              resourceType: 'ValueSet',
              url: 'http://hl7.org/fhir/us/ecr/ValueSet/ostc',
              experimental: false
            },
            search: {
              mode: 'match'
            }
          },
          {
            fullUrl: 'http://localhost:8082/fhir/ValueSet/1423',
            resource: {
              id: '1423',
              resourceType: 'ValueSet',
              url: 'http://hl7.org/fhir/us/ecr/ValueSet/lotc',
              experimental: false
            },
            search: {
              mode: 'match'
            }
          },
          {
            fullUrl: 'http://localhost:8082/fhir/ValueSet/1424',
            resource: {
              id: '1424',
              resourceType: 'ValueSet',
              url: 'http://hl7.org/fhir/us/ecr/ValueSet/lrtc',
              experimental: false
            },
            search: {
              mode: 'match'
            }
          },
          {
            fullUrl: 'http://localhost:8082/fhir/ValueSet/1425',
            resource: {
              id: '1425',
              resourceType: 'ValueSet',
              url: 'http://hl7.org/fhir/us/ecr/ValueSet/mrtc',
              experimental: false
            },
            search: {
              mode: 'match'
            }
          },
          {
            fullUrl: 'http://localhost:8082/fhir/ValueSet/1426',
            resource: {
              id: '1426',
              resourceType: 'ValueSet',
              url: 'http://hl7.org/fhir/us/ecr/ValueSet/sdtc',
              experimental: false
            },
            search: {
              mode: 'match'
            }
          }
        ]
      },
      response: {
        status: '200 OK'
      }
    },
    {
      resource: {
        resourceType: 'Bundle',
        id: '4c736aca-0eee-4328-9b4b-73713ee9bb12',
        meta: {
          lastUpdated: '2024-02-06T19:38:46.086+00:00'
        },
        type: 'searchset',
        total: 1,
        link: [
          {
            relation: 'self',
            url: 'http://localhost:8082/fhir/PlanDefinition?version=1.9.0.0-draft'
          }
        ],
        entry: [
          {
            fullUrl: 'http://localhost:8082/fhir/PlanDefinition/1419',
            resource: {
              id: '1419',
              resourceType: 'PlanDefinition',
              url: 'http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-instance-example',
              experimental: false,
              relatedArtifact: [
                {
                  type: 'depends-on',
                  label: 'RCTC Value Set Library of Trigger Codes',
                  resource: 'http://hl7.org/fhir/us/ecr/Library/library-rctc-example|1.9.0.0-draft'
                },
                {
                  type: 'composed-of',
                  resource: 'http://notOwnedTest.com/Library/notOwnedLeaf|0.1.1'
                }
              ]
            },
            search: {
              mode: 'match'
            }
          }
        ]
      },
      response: {
        status: '200 OK'
      }
    },
    {
      resource: {
        resourceType: 'Bundle',
        id: 'e7f089c4-03a0-4cc0-b0bd-b9932b5466e8',
        meta: {
          lastUpdated: '2024-02-06T19:38:46.098+00:00'
        },
        type: 'searchset',
        total: 2,
        link: [
          {
            relation: 'self',
            url: 'http://localhost:8082/fhir/Library?version=1.9.0.0-draft'
          }
        ],
        entry: [
          {
            fullUrl: 'http://localhost:8082/fhir/Library/1418',
            resource: {
              id: '1418',
              resourceType: 'Library',
              url: 'http://hl7.org/fhir/us/ecr/Library/SpecificationLibrary',
              experimental: false,
              relatedArtifact: [
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-instance-example|1.9.0.0-draft'
                },
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/Library/library-rctc-example|1.9.0.0-draft'
                },
                {
                  type: 'composed-of',
                  resource: 'http://notOwnedTest.com/Library/notOwnedRoot|0.1.1'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/PlanDefinition/plandefinition-ersd-instance-example|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/Library/library-rctc-example|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://notOwnedTest.com/Library/notOwnedRoot|0.1.1'
                },
                {
                  type: 'depends-on',
                  resource: 'http://notOwnedTest.com/Library/notOwnedLeaf|0.1.1'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/dxtc|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/ostc|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/lotc|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/lrtc|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/mrtc|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/sdtc|1.9.0.0-draft'
                },
                {
                  type: 'depends-on',
                  resource: 'http://notOwnedTest.com/Library/notOwnedLeaf1|0.1.1'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
                            code: 'emergent'
                          }
                        ],
                        text: 'Emergent'
                      }
                    },
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '49649001'
                          }
                        ],
                        text: 'Infection caused by Acanthamoeba (disorder)'
                      }
                    },
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1506|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1505|20240123'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1508|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1507|20230125'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20230602'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.528|20200516'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.408|20230122'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.409|20210527'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1469|20230122'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1468|20240123'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.480|20180620'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.481|20180620'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.761|20220119'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1223|20210528'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.762|20191227'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1182|20220602'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1181|20210526'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1184|20210526'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1601|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1600|20230602'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1603|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1602|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1082|20200513'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1439|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1436|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1435|20220118'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1446|20230122'
                },
                {
                  extension: [
                    {
                      url: 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition',
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: 'http://snomed.info/sct',
                            code: '767146004'
                          }
                        ],
                        text: 'Toxic effect of arsenic and/or arsenic compound'
                      }
                    }
                  ],
                  type: 'depends-on',
                  resource: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1438|20220118'
                }
              ]
            },
            search: {
              mode: 'match'
            }
          },
          {
            fullUrl: 'http://localhost:8082/fhir/Library/1420',
            resource: {
              id: '1420',
              resourceType: 'Library',
              url: 'http://hl7.org/fhir/us/ecr/Library/library-rctc-example',
              experimental: false,
              relatedArtifact: [
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/dxtc|1.9.0.0-draft'
                },
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/ostc|1.9.0.0-draft'
                },
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/lotc|1.9.0.0-draft'
                },
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/lrtc|1.9.0.0-draft'
                },
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/mrtc|1.9.0.0-draft'
                },
                {
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                      valueBoolean: true
                    }
                  ],
                  type: 'composed-of',
                  resource: 'http://hl7.org/fhir/us/ecr/ValueSet/sdtc|1.9.0.0-draft'
                },
                {
                  type: 'composed-of',
                  resource: 'http://notOwnedTest.com/Library/notOwnedLeaf1|0.1.1'
                }
              ]
            },
            search: {
              mode: 'match'
            }
          }
        ]
      },
      response: {
        status: '200 OK'
      }
    }
  ]
}
