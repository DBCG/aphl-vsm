// non-sensitive values for FE use (building dropdown, etc)
const terminologyServerEndpoints_FE = [
  {
    label: 'VSAC',
    dataId: 'vsac',
    value: {
      url: process.env.NEXT_PUBLIC_VSAC_BASE_URL,
      auth: true
    }
  },
  {
    label: 'Ontoserver (R4)',
    dataId: 'ontoserver_r4',
    value: {
      url: process.env.NEXT_PUBLIC_ONTOSERVER_R4_BASE_URL,
      auth: false
    }
  }
]

// includes username/password to call terminology client in server
const terminologyServerEndpoints_BE = [
  {
    id: 'vsac',
    url: process.env.NEXT_PUBLIC_VSAC_BASE_URL,
    authString: `${process.env.VSAC_USERNAME}:${process.env.VSAC_API_KEY}`
  },
  {
    id: 'ontoserver_r4',
    url: process.env.NEXT_PUBLIC_ONTOSERVER_R4_BASE_URL
  }
]

export { terminologyServerEndpoints_FE, terminologyServerEndpoints_BE }