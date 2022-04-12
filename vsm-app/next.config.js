/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true
  },
  basePath: '/aphl/vsmanager',
  async redirects() {
    return [{
      source: '/',
      destination: '/programs',
      permanent: true
    }
    ]
  }
}

module.exports = nextConfig
