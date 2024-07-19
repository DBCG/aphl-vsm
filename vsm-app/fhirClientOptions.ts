let terminologyServerEndpoints = [{ label: 'VSAC', value: { title: 'vsac', url: process.env.NEXT_PUBLIC_VSAC_BASE_URL } }]

if (process.env.NEXT_PUBLIC_SHOW_TEST_TERMINOLOGY_SERVER) {
  terminologyServerEndpoints.push({
    label: 'Ontoserver (R4)',
    value: { title: 'ontoserverR4', url: process.env.ONTOSERVER_R4_BASE_URL }
  })
}

const getTerminologySourceEndpoint = (terminologyName: string) => {
  terminologyServerEndpoints?.find((grp) => grp.value.title.toLowerCase() === terminologyName.toLowerCase())?.value?.url
}

export { terminologyServerEndpoints, getTerminologySourceEndpoint }
