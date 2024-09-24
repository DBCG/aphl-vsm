// Script to search FHIR CDR Server for missing or malformed authoratative sources

const FhirKitClient = require('fhir-kit-client')

const FHIR_CDR_URL = 'http://a88ebe212beb245098a829c6616a4850-1704460045.us-east-1.elb.amazonaws.com/fhir'
const FHIR_CDR_BASIC_AUTH_USERNAME = 'xxxxx'
const FHIR_CDR_BASIC_AUTH_PASSWORD = 'xxxx'
const fhirCdrAuthString = `${FHIR_CDR_BASIC_AUTH_USERNAME}:${FHIR_CDR_BASIC_AUTH_PASSWORD}`

const fhirCdrClient = new FhirKitClient({
  baseUrl: FHIR_CDR_URL,
  customHeaders: { Authorization: `Basic ${Buffer.from(fhirCdrAuthString).toString('base64')}` }
})

const run = async () => {
  const vsBundle = await fhirCdrClient.search({
    resourceType: 'ValueSet',
    searchParams: { _total: 'accurate', _count: 10000 }
  })
  const allVs = vsBundle.entry.map((entry) => entry.resource)
  console.log(`Found ${allVs.length} ValueSets`)
  await syncAuthoratativeSources(allVs)

  if (allVs?.link?.next) {
    console.log('TBD')
  }
  console.log('Finished')
}

const isGrouperValueSet = (vs) => vs?.meta?.profile?.includes('http://aphl.org/fhir/vsm/StructureDefinition/vsm-groupervalueset')

const isConditionValueSet = (vs) => vs.id === 'rckms-condition-codes'

const isVsmAuthored = (vs) => vs?.meta?.tag?.find((tag) => tag.code === 'vsm-authored')

//vs?.meta?.profile?.includes('http://aphl.org/fhir/vsm/StructureDefinition/vsm-conditionvalueset') ||

// Conditions to check for:
const syncAuthoratativeSources = async (allVs) => {
  const toUpdateVs = allVs
    .map((vs) => {
      try {
        const exists = vs?.extension?.find((ext) => ext.url === 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource')
        if (isGrouperValueSet(vs) || isConditionValueSet(vs) || isVsmAuthored(vs)) {
          return
        }

        if (!exists) {
          console.log(`ValueSet ${vs.id} is missing authoritative source`)
          if (vs?.extension == null) {
            vs.extension = []
          }
        } else if (exists.valueUri.endsWith('fhir')) {
          console.log(`ValueSet ${vs.id} has malformed authoritative source`)
          vs.extension = vs.extension.filter((ext) => ext.url !== 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource')
        } else if (exists.valueUri.startsWith('http://')) {
          console.log(`ValueSet ${vs.id} needs modified protocol for authoritative source`)
          vs.extension = vs.extension.filter((ext) => ext.url !== 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource')
        } else {
          return
        }
      } catch (e) {
        console.log('Error checking for authoritative source: ' + vs.id)
      }
      const oid = vs.url.split('/').pop()

      vs.extension.push({
        url: 'http://hl7.org/fhir/StructureDefinition/valueset-authoritativeSource',
        valueUri: `https://cts.nlm.nih.gov/fhir/ValueSet/${oid}`
      })

      return vs
    })
    .filter((i) => i)

  console.log(`Updating ${toUpdateVs.length} ValueSets`)
  await fhirCdrClient.batch({
    body: {
      resourceType: 'Bundle',
      type: 'batch',
      entry: toUpdateVs.map((vs) => ({
        resource: vs,
        request: {
          method: 'PUT',
          url: `ValueSet/${vs.id}`
        }
      }))
    }
  })
}

run()
