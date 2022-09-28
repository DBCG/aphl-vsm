const ONTOSERVER_R4_BASE_URL = 'https://r4.ontoserver.csiro.au/fhir'

let terminologyServerEndpoints = [
  { label: 'VSAC', dataId: 'VSAC', value: { title: 'vsac', url: process.env.NEXT_PUBLIC_VSAC_BASE_URL } },
]

if (process.env.NEXT_PUBLIC_SHOW_TEST_TERMINOLOGY_SERVER) {
  terminologyServerEndpoints.push(
    { label: 'Ontoserver (R4)', dataId: 'ontoserverR4', value: { title: 'ontoserverR4', url: ONTOSERVER_R4_BASE_URL } }
  )
}

export { terminologyServerEndpoints }