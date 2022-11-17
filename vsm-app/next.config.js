/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
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
