/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
`

const nextConfig = {
  compiler: {
    styledComponents: true
  },
  reactStrictMode: true,
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers:  [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, '')
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      },
      {
        // matching all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, Accept, Content-Length, Content-Type, Date, X-API-KEY'
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/programs',
        permanent: true
      },
      {
        source: '/admin/edit-endpoint',
        destination: '/admin',
        permanent: true
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
