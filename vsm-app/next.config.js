/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config

const cspHeader = `
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
  basePath: process.env.BASE_PATH || '',
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH || '',
  },
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
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
