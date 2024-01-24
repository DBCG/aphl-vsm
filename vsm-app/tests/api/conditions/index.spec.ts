import handler from '@/pages/api/conditions'

// Mock Auth for Setup
jest.mock('next-auth', () => jest.fn())
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockImplementation(() => ({
    user: {
      roles: ['admin']
    }
  }))
}))

describe('GET /api/conditions', () => {
  it('should get a list of conditions', async () => {
    
  })
})