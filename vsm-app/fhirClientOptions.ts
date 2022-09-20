const ONTOSERVER_R4_BASE_URL = 'https://r4.ontoserver.csiro.au/fhir'

const terminologyServerEndpoints = [
  { label: 'VSAC', dataId: 'VSAC', value: { title: 'vsac', url: process.env.NEXT_PUBLIC_VSAC_BASE_URL } },
  { label: 'Ontoserver (R4)', dataId: 'ontoserverR4', value: { title: 'ontoserverR4', url: ONTOSERVER_R4_BASE_URL } }
]

export { terminologyServerEndpoints, ONTOSERVER_R4_BASE_URL }