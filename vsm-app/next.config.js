/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  typescript: {
    ignoreBuildErrors: true
  },
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
