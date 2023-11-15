/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/programs',
        permanent: true
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
