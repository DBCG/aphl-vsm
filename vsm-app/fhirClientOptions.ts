let terminologyServerEndpoints = [{ label: 'VSAC', value: { id: 'vsac', url: process.env.NEXT_PUBLIC_VSAC_BASE_URL } }]

if (process.env.NEXT_PUBLIC_SHOW_TEST_TERMINOLOGY_SERVER) {
  terminologyServerEndpoints.push({
    label: 'Ontoserver (R4)',
    value: { id: 'ontoserverR4', url: process.env.ONTOSERVER_R4_BASE_URL }
  })
}

const getTerminologySourceEndpoint = (terminologyName: string) => {
  return terminologyServerEndpoints?.find((grp) => grp.value.id.toLowerCase() === terminologyName.toLowerCase())?.value?.url
}

export { terminologyServerEndpoints, getTerminologySourceEndpoint }
