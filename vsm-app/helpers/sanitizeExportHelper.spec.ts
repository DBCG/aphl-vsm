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
})