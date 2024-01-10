import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/programs/index'


describe('/api/programs', () => {
  test('returns all the progrmas', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })
    const response = await handler(req, res)
    expect(response.statusCode).toBe(200)

    // TODO: we need to stub the fhir api call
    expect(response._getData().programs.length).toBeGreaterThan(0)
  
  })
})