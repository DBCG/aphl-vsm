/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  compiler: {
    styledComponents: true
  },
  reactStrictMode: true,
  compress: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/programs',
        permanent: true
      },{
        source: '/admin/edit-endpoint',
        destination: '/admin',
        permanent: true
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
