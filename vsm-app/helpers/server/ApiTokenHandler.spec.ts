import APITokenHandler from './ApiTokenHandler'
import fetchMock from 'jest-fetch-mock'

const JWT_RESPONSE_FIXTURE = JSON.stringify({
  access_token: 'jwtToken',
  expires_in: 36000,
  refresh_expires_in: 0,
  token_type: 'Bearer',
  'not-before-policy': 0,
  scope: 'profile email'
})

const KEYCLOAK_USER_ATTRIBUTE_FIXTURE = JSON.stringify({
  id: '123',
  createdTimestamp: 1719259496721,
  username: 'johndoe',
  attributes: {
    '4444': [
      '36b42c1d0bbe0683091c1e862e904038:906e9ad702092754a7ab639f5c964d26e6762a9662e6ef8c9e412974a89e6b67ded38efe485fa52506e5e1b9c3e534ed909e739a429f89357242f8a0bef369c0'
    ]
  }
})

describe('ApiTokenHandler', () => {
  beforeEach(() => {
    fetchMock.enableMocks()
  })

  afterEach(() => {
    fetchMock.resetMocks()
    APITokenHandler.getInstance().resetState() // Because we are using a singleton we need to reset the state after each test
  })

  it('Should get instance of APITokenHandler and renew cached jwt token', () => {
    const instance = APITokenHandler.getInstance()
    expect(instance).toBeInstanceOf(APITokenHandler)
  })

  it('Should get basic auth creds for a given id', async () => {
    fetchMock.mockResponseOnce(JWT_RESPONSE_FIXTURE)

    fetchMock.mockResponseOnce(KEYCLOAK_USER_ATTRIBUTE_FIXTURE)
    const instance = APITokenHandler.getInstance()

    const creds = await instance.getBasicAuthCreds('123', '4444')
    expect(creds).toEqual({
      serverId: '4444',
      username: 'johndoe',
      password: 'password'
    })
  })

  it('Should store credentials in Keycloak', async () => {
    fetchMock.mockResponseOnce(JWT_RESPONSE_FIXTURE)
    
    fetchMock.mockResponseOnce(KEYCLOAK_USER_ATTRIBUTE_FIXTURE, {status: 200})

    fetchMock.mockResponseOnce(JSON.stringify({}), { status: 204 })

    const instance = APITokenHandler.getInstance()
    await instance.storeBasicAuthCreds('123', '4444', 'johndoe', 'newpassword')

    const payloadBody = JSON.parse(fetchMock.mock.calls[2][1].body)
    expect(payloadBody.attributes['4444'][0]).toContain(':')
    expect(payloadBody.createdTimestamp).toBe(1719259496721)
  })
})
