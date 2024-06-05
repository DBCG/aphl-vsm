export const changelog = {
  pages: [
    {
      oldData: {
        title: {
          value: "deleted title",
          operation: {
            type: "delete",
            path: "title",
            oldValue: "deleted title"
          }
        },
        id: {
          value: "SpecificationLibrary",
          operation: {
            type: "replace",
            path: "id",
            newValue: "f6f5731a-0c18-48f5-a8a5-3b0f43501121"
          }
        },
        version: {
          value: "2022-10-19",
          operation: {
            type: "replace",
            path: "version",
            newValue: "1.0.0.0-draft"
          }
        },
        resourceType: "Library",
        name: {},
        purpose: {},
        effectiveStart: {},
        releaseDate: {},
        relatedArtifacts: [
          {
            value: {
              extension: [
                {
                  url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
                  valueBoolean: true
                }
              ],
              type: "composed-of",
              resource: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[0].resource",
              newValue: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|1.0.0.0-draft"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0",
            conditions: [],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
                  valueBoolean: true
                }
              ],
              type: "composed-of",
              resource: "http://ersd.aimsplatform.org/fhir/Library/rctc|2022-10-19"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[1].resource",
              newValue: "http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0.0-draft"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/Library/rctc|2022-10-19",
            conditions: [],
            priority: {}
          },
          {
            value: {
              type: "composed-of",
              resource: "http://notOwnedTest.com/Library/notOwnedRoot|0.1.1"
            },
            targetUrl: "http://notOwnedTest.com/Library/notOwnedRoot|0.1.1",
            conditions: [],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                },
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "000000000"
                      }
                    ],
                    text: "this will be deleted"
                  }
                }
              ],
              type: "depends-on",
              resource: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.11.1090|20210526"
            },
            targetUrl: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.11.1090|20210526",
            conditions: [
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              },
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "000000000"
                      }
                    ],
                    text: "this will be deleted"
                  }
                },
                operation: {
                  type: "delete",
                  path: "relatedArtifact[3].extension[1]",
                  oldValue: {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "000000000"
                        }
                      ],
                      text: "this will be deleted"
                    }
                  }
                }
              }
            ],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              ],
              type: "depends-on",
              resource: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1505|1.0.0"
            },
            targetUrl: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1505|1.0.0",
            conditions: [
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              }
            ],
            priority: {}
          },
          {
            value: {
              type: "depends-on",
              resource: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|2022-10-19"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[5].resource",
              newValue: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0.0-draft"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|2022-10-19",
            conditions: [],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                        code: "emergent"
                      }
                    ],
                    text: "Emergent"
                  }
                },
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                },
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "767146004"
                      }
                    ],
                    text: "Toxic effect of arsenic and its compounds (disorder)"
                  }
                }
              ],
              type: "depends-on",
              resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526"
            },
            operation: {
              type: "delete",
              path: "relatedArtifact[6]",
              oldValue: {
                extension: [
                  {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                          code: "emergent"
                        }
                      ],
                      text: "Emergent"
                    }
                  },
                  {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "49649001"
                        }
                      ],
                      text: "Infection caused by Acanthamoeba (disorder)"
                    }
                  },
                  {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "767146004"
                        }
                      ],
                      text: "Toxic effect of arsenic and its compounds (disorder)"
                    }
                  }
                ],
                type: "depends-on",
                resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526"
              }
            },
            targetUrl: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526",
            conditions: [
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              },
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "767146004"
                      }
                    ],
                    text: "Toxic effect of arsenic and its compounds (disorder)"
                  }
                }
              }
            ],
            priority: {
              value: {
                url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                valueCodeableConcept: {
                  coding: [
                    {
                      system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                      code: "emergent"
                    }
                  ],
                  text: "Emergent"
                }
              }
            }
          }
        ]
      },
      newData: {
        title: {},
        id: {
          value: "f6f5731a-0c18-48f5-a8a5-3b0f43501121",
          operation: {
            type: "replace",
            path: "id",
            oldValue: "SpecificationLibrary"
          }
        },
        version: {
          value: "1.0.0.0-draft",
          operation: {
            type: "replace",
            path: "version",
            oldValue: "2022-10-19"
          }
        },
        resourceType: "Library",
        name: {
          value: "Updated name",
          operation: {
            type: "insert",
            path: "name",
            newValue: "Updated name"
          }
        },
        purpose: {
          value: "UpdatedPurpose",
          operation: {
            type: "insert",
            path: "purpose",
            newValue: "UpdatedPurpose"
          }
        },
        effectiveStart: {
          value: "Thu Oct 01 00:00:00 EDT 2020",
          operation: {
            type: "insert",
            path: "effectivePeriod",
            newValue: {
              start: "2020-10-01",
              end: "2025-10-01"
            }
          }
        },
        releaseDate: {},
        relatedArtifacts: [
          {
            value: {
              extension: [
                {
                  url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
                  valueBoolean: true
                }
              ],
              type: "composed-of",
              resource: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|1.0.0.0-draft"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[0].resource",
              oldValue: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|2.0.0"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification|1.0.0.0-draft",
            conditions: [],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
                  valueBoolean: true
                }
              ],
              type: "composed-of",
              resource: "http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0.0-draft"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[1].resource",
              oldValue: "http://ersd.aimsplatform.org/fhir/Library/rctc|2022-10-19"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/Library/rctc|1.0.0.0-draft",
            conditions: [],
            priority: {}
          },
          {
            value: {
              type: "composed-of",
              resource: "http://notOwnedTest.com/Library/notOwnedRoot|0.1.1"
            },
            targetUrl: "http://notOwnedTest.com/Library/notOwnedRoot|0.1.1",
            conditions: [],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                },
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "767146004"
                      }
                    ],
                    text: "Toxic effect of arsenic and its compounds (disorder)"
                  }
                }
              ],
              type: "depends-on",
              resource: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.11.1090|20210526"
            },
            targetUrl: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.11.1090|20210526",
            conditions: [
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              },
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "767146004"
                      }
                    ],
                    text: "Toxic effect of arsenic and its compounds (disorder)"
                  }
                },
                operation: {
                  type: "insert",
                  path: "relatedArtifact[3].extension",
                  newValue: {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "767146004"
                        }
                      ],
                      text: "Toxic effect of arsenic and its compounds (disorder)"
                    }
                  }
                }
              }
            ],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              ],
              type: "depends-on",
              resource: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1505|1.0.0"
            },
            targetUrl: "https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.1505|1.0.0",
            conditions: [
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "49649001"
                      }
                    ],
                    text: "Infection caused by Acanthamoeba (disorder)"
                  }
                }
              }
            ],
            priority: {}
          },
          {
            value: {
              type: "depends-on",
              resource: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0.0-draft"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[5].resource",
              oldValue: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|2022-10-19"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0.0-draft",
            conditions: [],
            priority: {}
          },
          {
            value: {
              extension: [
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                        code: "emergent"
                      }
                    ],
                    text: "Emergent"
                  }
                },
                {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "123123123"
                      }
                    ]
                  }
                }
              ],
              type: "depends-on",
              resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.163|20220603"
            },
            operation: {
              type: "insert",
              path: "relatedArtifact",
              newValue: {
                extension: [
                  {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                          code: "emergent"
                        }
                      ],
                      text: "Emergent"
                    }
                  },
                  {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "123123123"
                        }
                      ]
                    }
                  }
                ],
                type: "depends-on",
                resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.163|20220603"
              }
            },
            targetUrl: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.163|20220603",
            conditions: [
              {
                value: {
                  url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "http://snomed.info/sct",
                        code: "123123123"
                      }
                    ]
                  }
                }
              }
            ],
            priority: {
              value: {
                url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                valueCodeableConcept: {
                  coding: [
                    {
                      system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                      code: "emergent"
                    }
                  ],
                  text: "Emergent"
                }
              }
            }
          }
        ]
      },
      url: "http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary"
    },
    {
      oldData: {
        title: {},
        id: {
          value: "us-ecr-specification",
          operation: {
            type: "replace",
            path: "id",
            newValue: "6f8aa183-71bf-4fdf-9843-2a9039f22d26"
          }
        },
        version: {
          value: "2.0.0",
          operation: {
            type: "replace",
            path: "version",
            newValue: "1.0.0.0-draft"
          }
        },
        resourceType: "PlanDefinition"
      },
      newData: {
        title: {},
        id: {
          value: "6f8aa183-71bf-4fdf-9843-2a9039f22d26",
          operation: {
            type: "replace",
            path: "id",
            oldValue: "us-ecr-specification"
          }
        },
        version: {
          value: "1.0.0.0-draft",
          operation: {
            type: "replace",
            path: "version",
            oldValue: "2.0.0"
          }
        },
        resourceType: "PlanDefinition"
      },
      url: "http://ersd.aimsplatform.org/fhir/PlanDefinition/us-ecr-specification"
    },
    {
      oldData: {
        title: {},
        id: {
          value: "rctc",
          operation: {
            type: "replace",
            path: "id",
            newValue: "9f226bbb-a4dd-4ef1-834f-23e7a51fd8b5"
          }
        },
        version: {
          value: "2022-10-19",
          operation: {
            type: "replace",
            path: "version",
            newValue: "1.0.0.0-draft"
          }
        },
        resourceType: "Library",
        name: {},
        purpose: {},
        effectiveStart: {},
        releaseDate: {},
        relatedArtifacts: [
          {
            value: {
              extension: [
                {
                  url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
                  valueBoolean: true
                }
              ],
              type: "composed-of",
              resource: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|2022-10-19"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[0].resource",
              newValue: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0.0-draft"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|2022-10-19",
            conditions: [],
            priority: {}
          },
          {
            value: {
              type: "composed-of",
              resource: "http://notOwnedTest.com/Library/notOwnedLeaf2|0.1.1"
            },
            targetUrl: "http://notOwnedTest.com/Library/notOwnedLeaf2|0.1.1",
            conditions: [],
            priority: {}
          }
        ]
      },
      newData: {
        title: {},
        id: {
          value: "9f226bbb-a4dd-4ef1-834f-23e7a51fd8b5",
          operation: {
            type: "replace",
            path: "id",
            oldValue: "rctc"
          }
        },
        version: {
          value: "1.0.0.0-draft",
          operation: {
            type: "replace",
            path: "version",
            oldValue: "2022-10-19"
          }
        },
        resourceType: "Library",
        name: {},
        purpose: {},
        effectiveStart: {},
        releaseDate: {},
        relatedArtifacts: [
          {
            value: {
              extension: [
                {
                  url: "http://hl7.org/fhir/StructureDefinition/crmi-isOwned",
                  valueBoolean: true
                }
              ],
              type: "composed-of",
              resource: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0.0-draft"
            },
            operation: {
              type: "replace",
              path: "relatedArtifact[0].resource",
              oldValue: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|2022-10-19"
            },
            targetUrl: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc|1.0.0.0-draft",
            conditions: [],
            priority: {}
          },
          {
            value: {
              type: "composed-of",
              resource: "http://notOwnedTest.com/Library/notOwnedLeaf2|0.1.1"
            },
            targetUrl: "http://notOwnedTest.com/Library/notOwnedLeaf2|0.1.1",
            conditions: [],
            priority: {}
          }
        ]
      },
      url: "http://ersd.aimsplatform.org/fhir/Library/rctc"
    },
    {
      oldData: {
        title: {},
        id: {
          value: "dxtc",
          operation: {
            type: "replace",
            path: "id",
            newValue: "90d82870-00a4-4ebc-a047-d9a13909a5c0"
          }
        },
        version: {
          value: "2022-10-19",
          operation: {
            type: "replace",
            path: "version",
            newValue: "1.0.0.0-draft"
          }
        },
        resourceType: "ValueSet",
        codes: [
          {
            system: "http://snomed.info/sct",
            code: "772155008",
            version: "Provisional_2022-01-10",
            display: "Acute poliomyelitis suspected (situation)",
            memberOid: "2.16.840.1.113883.3.464.1003.113.11.1090",
            codeSystemOid: "2.16.840.1.113883.6.96"
          },
          {
            system: "http://snomed.info/sct",
            code: "1086051000119107",
            version: "Provisional_2022-04-25",
            display: "Cardiomyopathy due to diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[3]",
              oldValue: "1086051000119107"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "1086061000119109",
            version: "Provisional_2022-04-25",
            display: "Diphtheria radiculomyelitis (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[4]",
              oldValue: "1086061000119109"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "1086071000119103",
            version: "Provisional_2022-04-25",
            display: "Diphtheria tubulointerstitial nephropathy (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[5]",
              oldValue: "1086071000119103"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "1090211000119102",
            version: "Provisional_2022-04-25",
            display: "Pharyngeal diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[6]",
              oldValue: "1090211000119102"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "129667001",
            version: "Provisional_2022-04-25",
            display: "Diphtheritic peripheral neuritis (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[7]",
              oldValue: "129667001"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "13596001",
            version: "Provisional_2022-04-25",
            display: "Diphtheritic peritonitis (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[8]",
              oldValue: "13596001"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "15682004",
            version: "Provisional_2022-04-25",
            display: "Anterior nasal diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[9]",
              oldValue: "15682004"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "186347006",
            version: "Provisional_2022-04-25",
            display: "Diphtheria of penis (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[10]",
              oldValue: "186347006"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "18901009",
            version: "Provisional_2022-04-25",
            display: "Cutaneous diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[11]",
              oldValue: "18901009"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "194945009",
            version: "Provisional_2022-04-25",
            display: "Acute myocarditis - diphtheritic (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[12]",
              oldValue: "194945009"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "230596007",
            version: "Provisional_2022-04-25",
            display: "Diphtheritic neuropathy (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[13]",
              oldValue: "230596007"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "240422004",
            version: "Provisional_2022-04-25",
            display: "Tracheobronchial diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[14]",
              oldValue: "240422004"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "26117009",
            version: "Provisional_2022-04-25",
            display: "Diphtheritic myocarditis (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[15]",
              oldValue: "26117009"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "276197005",
            version: "Provisional_2022-04-25",
            display: "Infection caused by Corynebacterium diphtheriae (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[16]",
              oldValue: "276197005"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "3419005",
            version: "Provisional_2022-04-25",
            display: "Faucial diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[17]",
              oldValue: "3419005"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "397428000",
            version: "Provisional_2022-04-25",
            display: "Diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[18]",
              oldValue: "397428000"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "397430003",
            version: "Provisional_2022-04-25",
            display: "Diphtheria caused by Corynebacterium diphtheriae (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[19]",
              oldValue: "397430003"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "48278001",
            version: "Provisional_2022-04-25",
            display: "Diphtheritic cystitis (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[20]",
              oldValue: "48278001"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "50215002",
            version: "Provisional_2022-04-25",
            display: "Laryngeal diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[21]",
              oldValue: "50215002"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "715659006",
            version: "Provisional_2022-04-25",
            display: "Diphtheria of respiratory system (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[22]",
              oldValue: "715659006"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "75589004",
            version: "Provisional_2022-04-25",
            display: "Nasopharyngeal diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[23]",
              oldValue: "75589004"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "7773002",
            version: "Provisional_2022-04-25",
            display: "Conjunctival diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[24]",
              oldValue: "7773002"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "789005009",
            version: "Provisional_2022-04-25",
            display: "Paralysis of uvula after diphtheria (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "delete",
              path: "expansion.contains[25]",
              oldValue: "789005009"
            }
          }
        ],
        leafValuesets: [
          {
            memberOid: "2.16.840.1.113883.3.464.1003.113.11.1090",
            conditions: [
              {
                system: "http://snomed.info/sct",
                code: "49649001",
                codeSystemOid: "2.16.840.1.113883.6.96"
              },
              {
                system: "http://snomed.info/sct",
                code: "000000000",
                codeSystemOid: "2.16.840.1.113883.6.96",
                operation: {
                  type: "delete",
                  path: "relatedArtifact[3].extension[1]",
                  oldValue: {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "000000000"
                        }
                      ],
                      text: "this will be deleted"
                    }
                  }
                }
              }
            ],
            priority: {}
          },
          {
            memberOid: "2.16.840.1.113762.1.4.1146.1505",
            conditions: [
              {
                system: "http://snomed.info/sct",
                code: "49649001",
                codeSystemOid: "2.16.840.1.113883.6.96"
              }
            ],
            priority: {}
          },
          {
            memberOid: "2.16.840.1.113762.1.4.1146.6",
            conditions: [
              {
                system: "http://snomed.info/sct",
                code: "49649001",
                codeSystemOid: "2.16.840.1.113883.6.96"
              },
              {
                system: "http://snomed.info/sct",
                code: "767146004",
                codeSystemOid: "2.16.840.1.113883.6.96"
              }
            ],
            priority: {
              value: "emergent"
            },
            operation: {
              type: "delete",
              path: "compose.include[2]",
              oldValue: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.6|20210526"
            }
          }
        ],
        operations: [
          {
            type: "replace",
            path: "id",
            newValue: "90d82870-00a4-4ebc-a047-d9a13909a5c0"
          },
          {
            type: "replace",
            path: "version",
            newValue: "1.0.0.0-draft"
          },
          {
            type: "replace",
            path: "status",
            newValue: "DRAFT"
          },
          {
            type: "replace",
            path: "expansion.identifier",
            newValue: "fcebaf53-0a18-47cc-9cc4-3889852596b0"
          }
        ]
      },
      newData: {
        title: {},
        id: {
          value: "90d82870-00a4-4ebc-a047-d9a13909a5c0",
          operation: {
            type: "replace",
            path: "id",
            oldValue: "dxtc"
          }
        },
        version: {
          value: "1.0.0.0-draft",
          operation: {
            type: "replace",
            path: "version",
            oldValue: "2022-10-19"
          }
        },
        resourceType: "ValueSet",
        codes: [
          {
            system: "http://snomed.info/sct",
            code: "772155008",
            version: "Provisional_2022-01-10",
            display: "Acute poliomyelitis suspected (situation)",
            memberOid: "2.16.840.1.113883.3.464.1003.113.11.1090",
            codeSystemOid: "2.16.840.1.113883.6.96"
          },
          {
            system: "http://snomed.info/sct",
            code: "1193749009",
            version: "1.2.3",
            display: "Inflammation of small intestine caused by Vibrio cholerae (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[3].code",
              newValue: "1193749009"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "1193750009",
            version: "1.2.3",
            display: "Inflammation of intestine caused by Vibrio cholerae (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[4].code",
              newValue: "1193750009"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "240349003",
            version: "1.2.3",
            display: "Cholera caused by Vibrio cholerae O1 Classical biotype (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[5].code",
              newValue: "240349003"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "240350003",
            version: "1.2.3",
            display: "Cholera - non-O1 group vibrio (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[6].code",
              newValue: "240350003"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "240351004",
            version: "1.2.3",
            display: "Cholera - O139 group Vibrio cholerae (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[7].code",
              newValue: "240351004"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "447282003",
            version: "1.2.3",
            display: "Intestinal infection caused by Vibrio cholerae O1 (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[8].code",
              newValue: "447282003"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "63650001",
            version: "1.2.3",
            display: "Cholera (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[9].code",
              newValue: "63650001"
            }
          },
          {
            system: "http://snomed.info/sct",
            code: "81020007",
            version: "1.2.3",
            display: "Cholera caused by Vibrio cholerae El Tor (disorder)",
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            codeSystemOid: "2.16.840.1.113883.6.96",
            operation: {
              type: "insert",
              path: "expansion.contains[10].code",
              newValue: "81020007"
            }
          }
        ],
        leafValuesets: [
          {
            memberOid: "2.16.840.1.113883.3.464.1003.113.11.1090",
            conditions: [
              {
                system: "http://snomed.info/sct",
                code: "49649001",
                codeSystemOid: "2.16.840.1.113883.6.96"
              },
              {
                system: "http://snomed.info/sct",
                code: "767146004",
                codeSystemOid: "2.16.840.1.113883.6.96",
                operation: {
                  type: "insert",
                  path: "relatedArtifact[3].extension",
                  newValue: {
                    url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                    valueCodeableConcept: {
                      coding: [
                        {
                          system: "http://snomed.info/sct",
                          code: "767146004"
                        }
                      ],
                      text: "Toxic effect of arsenic and its compounds (disorder)"
                    }
                  }
                }
              }
            ],
            priority: {}
          },
          {
            memberOid: "2.16.840.1.113762.1.4.1146.1505",
            conditions: [
              {
                system: "http://snomed.info/sct",
                code: "49649001",
                codeSystemOid: "2.16.840.1.113883.6.96"
              }
            ],
            priority: {}
          },
          {
            memberOid: "2.16.840.1.113762.1.4.1146.163",
            conditions: [
              {
                system: "http://snomed.info/sct",
                code: "123123123",
                codeSystemOid: "2.16.840.1.113883.6.96"
              }
            ],
            priority: {
              value: "emergent",
              operation: {
                type: "insert",
                path: "relatedArtifact",
                newValue: {
                  extension: [
                    {
                      url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-priority",
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                            code: "emergent"
                          }
                        ],
                        text: "Emergent"
                      }
                    },
                    {
                      url: "http://aphl.org/fhir/vsm/StructureDefinition/vsm-valueset-condition",
                      valueCodeableConcept: {
                        coding: [
                          {
                            system: "http://snomed.info/sct",
                            code: "123123123"
                          }
                        ]
                      }
                    }
                  ],
                  type: "depends-on",
                  resource: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.163|20220603"
                }
              }
            },
            operation: {
              type: "insert",
              path: "compose.include[2].valueSet",
              newValue: "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1146.163"
            }
          }
        ],
        operations: [
          {
            type: "replace",
            path: "id",
            oldValue: "dxtc"
          },
          {
            type: "replace",
            path: "version",
            oldValue: "2022-10-19"
          },
          {
            type: "replace",
            path: "status",
            oldValue: "ACTIVE"
          },
          {
            type: "insert",
            path: "useContext",
            newValue: {
              code: {
                system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type",
                code: "priority"
              },
              valueCodeableConcept: {
                coding: [
                  {
                    system: "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",
                    code: "routine"
                  }
                ],
                text: "Routine"
              }
            }
          },
          {
            type: "replace",
            path: "expansion.identifier",
            oldValue: "0f65e11d-25b4-4221-aafb-1e0fb1cfdc6d"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[3].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[3].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[3].display",
            newValue: "Inflammation of small intestine caused by Vibrio cholerae (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[4].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[4].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[4].display",
            newValue: "Inflammation of intestine caused by Vibrio cholerae (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[5].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[5].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[5].display",
            newValue: "Cholera caused by Vibrio cholerae O1 Classical biotype (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[6].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[6].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[6].display",
            newValue: "Cholera - non-O1 group vibrio (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[7].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[7].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[7].display",
            newValue: "Cholera - O139 group Vibrio cholerae (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[8].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[8].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[8].display",
            newValue: "Intestinal infection caused by Vibrio cholerae O1 (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[9].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[9].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[9].display",
            newValue: "Cholera (disorder)"
          },
          {
            type: "insert",
            path: "expansion.contains"
          },
          {
            type: "insert",
            path: "expansion.contains[10].system",
            newValue: "http://snomed.info/sct"
          },
          {
            type: "insert",
            path: "expansion.contains[10].version",
            newValue: "1.2.3"
          },
          {
            type: "insert",
            path: "expansion.contains[10].display",
            newValue: "Cholera caused by Vibrio cholerae El Tor (disorder)"
          }
        ]
      },
      url: "http://ersd.aimsplatform.org/fhir/ValueSet/dxtc"
    }
  ],
  manifestUrl: "http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary"
}