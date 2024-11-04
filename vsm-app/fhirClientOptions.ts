let terminologyServerEndpoints = [{ label: 'VSAC', value: { id: 'vsac', url: process.env.NEXT_PUBLIC_VSAC_BASE_URL } }]

const getTerminologySourceEndpoint = (terminologyName: string) => {
  return terminologyServerEndpoints?.find((grp) => grp.value.id.toLowerCase() === terminologyName.toLowerCase())?.value?.url
}

export { terminologyServerEndpoints, getTerminologySourceEndpoint }
