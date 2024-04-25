import seedData from '../../documentation/demo-data/updated-transaction-bundle.json'

import sanitizeExportHelper, { URLS_TO_REMOVE } from './sanitizeExportHelper'

describe('sanitizeExportHelper', () => {
  it('should sanitize export', () => {
    let didFindUrls = false
    const sanitizedExport = sanitizeExportHelper(seedData as fhir4.Bundle)

    for(let i = 0; i < sanitizedExport.entry.length; i++) {
      if (sanitizedExport.entry[i]?.resource?.meta?.profile) {
        sanitizedExport.entry[i].resource?.meta?.profile.forEach((profile) => {
          if (URLS_TO_REMOVE.has(profile)) {
            didFindUrls = true
          }
        })
      }
    }
    expect(didFindUrls).toBeFalsy()
  })

  it('should sanitize export when string format', () => {
    let didFindUrls = false
    const bundleXML = '<Bundle xmlns="http://hl7.org/fhir"><entry><resource><meta><profile value="http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library"/></meta></resource><resource><meta><profile value="http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset"/></meta></resource>'
    const sanitizedExport = sanitizeExportHelper(bundleXML) as string

    URLS_TO_REMOVE.forEach((url) => {
      if (sanitizedExport.includes(url)) {
        didFindUrls = true
      }
    })
    expect(didFindUrls).toBeFalsy()
  })
})