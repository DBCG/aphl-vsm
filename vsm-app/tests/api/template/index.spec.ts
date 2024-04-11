import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/template'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin'],
      email: 'superman@gotham.com'
    }
  }))
}))

describe('/api/template', () => {
  test('POST /api/template, clones a program', async () => {

  })
})