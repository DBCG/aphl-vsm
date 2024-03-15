// change log is not the same as difference viewer
// won't be represented as Parameters
// don't necessarily want to show every field that's different...

// possibly render different sorts of tables

// use index placement to represent what's older or newer (older [0])?

// possible display logic configuration to render only certain parts of given resourceType?
// default just renders everything, config for UI generator limits or adjusts?
// option to flatten certain data?

const changeLog = {
  resourceType: 'Library',
  // fields that you want to track/display within metadata
  metadataComparison: [
    // index 0 is previous version?
    {
      name: 'Reportable Condition Trigger Codes (RCTC)',
      purpose: 'Some purpose information here',
      oid: '2.16.840.1.114222.4.11.7508', // id
      definitionVersion: '1.2.0', // version
      effectiveStart: '6/1/24', // effectivePeriod.start
      releaseDate: '8/4/24' // RCTC changelog has this field, but our data doesn't have releaseDate... just approval, set when first approved?
    },
    {
      name: 'Reportable Condition Trigger Codes (RCTC) NEW',
      purpose: 'Some different purpose information here',
      oid: '2.16.840.1.114222.4.11.7508',
      // how would we handle asymmetric keys like below? create empty value in data?
      // asymmetry in tables is a problem for header/detail structure
      definitionVersion: '', // if empty value for key, was removed
      effectiveStart: '6/1/24',
      releaseDate: '8/4/24'
    }
  ],
  // relatedArtifact composed-of items
  children: [
    {
      // plandef actions are pretty nested... how to show that?
      // what information matters in the planDefinition to show?
      resourceType: 'PlanDefinition',
      metadataComparison: [
        {
          title: 'eRSD PlanDefinition (old)',
          id: 'us-ecr-specification'
        },
        {
          title: 'eRSD PlanDefinition',
          id: 'us-ecr-specification-2'
        }
      ]
    },
    {
      resourceType: 'Library',
      metadataComparison: [
        {
          title: 'Library RCTC Example',
          id: 'library-rctc-1'
        },
        {
          title: 'Library RCTC Example',
          id: 'us-ecr-specification-2'
        }

      ] ,
      children: [
        // first grouper:
        {
          resourceType: 'ValueSet', // this is the grouper valueset level
          metadataComparison: [
            {}, // empty metadata at [0] index could mean this grouper didn't exist before?
            {
              id: 'test-valueset-id',
              version: '20221118',
              title: 'grouper valueset 1',
              priority: '', // grouper would not have associated priority
              conditions: [], // grouper does not have associated conditions
              codes: [] // grouper does not directly contain codes
            }
          ],
          children: [
            {
              resourceType: 'ValueSet', // leaf valueSet
              metadataComparison: [
                {}, // empty at [0] because the grouper didn't exist before, so this leaf didn't exist
                {
                  id: 'test-leaf-id',
                  version: '20221118',
                  title: 'leaf valueset 1',
                  priority: 'emergent', // if this valueset's url is found in top level library's vsm-valueset-priority extension
                  conditions: [
                    {
                      system: 'http://snomed.info/sct',
                      code: '49649001',
                      version: '20220101',
                      text: 'Infection caused by Acanthamoeba (disorder)'
                    },
                    {
                      system: 'http://snomed.info/sct',
                      code: '49649002',
                      version: '20220101',
                      text: 'Infection caused by Anthrax (disorder)'
                    }
                  ], // find conditions in top level library's vsm-valueset-condition extension
                  codes: [ // since this grouper and leaf are new, all codes considered added
                    {
                      id: '283.345.345.3245.3',
                      code: '239842',
                      title: 'Some test code for Anthrax',
                      system: 'http://snomed.info/sct',
                      version: '20220101'
                    }
                  ]
                }
              ]
            }
          ]
        },
        // second grouper:
        {
          resourceType: 'ValueSet', // this is the grouper valueset level
          metadataComparison: [
            {
              id: 'test-valueset-id-3',
              version: '20221118',
              title: 'grouper valueset a',
              priority: '', // grouper would not have associated priority
              conditions: [], // grouper does not have associated conditions
              codes: [] // grouper does not directly contain codes
            },
            {
              id: 'test-valueset-id-4',
              version: '20221118',
              title: 'grouper valueset b',
              priority: '', // grouper would not have associated priority
              conditions: [], // grouper does not have associated conditions
              codes: [] // grouper does not directly contain codes
            }
          ],
          children: [
            {
              resourceType: 'ValueSet', // leaf valueSet
              metadataComparison: [
                {
                  id: 'test-leaf-id',
                  version: '20221118',
                  title: 'leaf valueset 1',
                  priority: 'emergent', // if this valueset's url is found in top level library's vsm-valueset-priority extension
                  conditions: [
                    {
                      system: 'http://snomed.info/sct',
                      code: '49649001',
                      version: '20220101',
                      text: 'Infection caused by Acanthamoeba (disorder)'
                    },
                    {
                      system: 'http://snomed.info/sct',
                      code: '49649002',
                      version: '20220101',
                      text: 'Infection caused by Anthrax (disorder)'
                    }
                  ], // find conditions in top level library's vsm-valueset-condition extension
                  codes: [
                    {
                      id: '283.345.345.3245.3',
                      code: '239842',
                      title: 'Some test code for Anthrax',
                      system: 'http://snomed.info/sct',
                      version: '20220101'
                    }
                  ]
                },
                {} // empty at [1] because this leaf valueset was removed
              ]
            }
          ]
        }
      ]
    }
  ]
}

// 1. how to compose a representation of the differences between two programs to be shown as tables?
// 2. how to encode data points to ignore?
// 3. how to represent that we want to see something in a flat table, though may be nested relatedArtifact?

