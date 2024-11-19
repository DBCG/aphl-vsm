import logger from '@/helpers/server/logger'
import crypto from 'crypto'
import { cloneDeep } from 'lodash'

if (process.env.KEY == null) {
  logger.error('Symmetric key not found in env variables')
  throw new Error('Symmetric key not found in env variables')
}

type KeyCloakUser = {
  id: string
  attributes: {
    [key: string]: string[]
  }
}

const KEY = Buffer.from(process.env.KEY, 'hex')

const KEYCLOAK_BASE_URL = new URL(process.env.KEYCLOAK_ISSUER || '')?.origin

class APITokenHandler {
  private static instance: APITokenHandler
  private _cacheJWT: string | undefined
  private _cacheJWTExpiry: number | undefined // Should be set in keycloak to expire in 1 day

  private constructor() {}

  public static getInstance(): APITokenHandler {
    if (!APITokenHandler.instance) {
      APITokenHandler.instance = new APITokenHandler()
    }

    return APITokenHandler.instance
  }

  /**
   * Retrieves basic auth creds for a given url
   */
  public async getBasicAuthCreds(userId: string, serverId: string) {
    await this.renewKeyCloakToken()
    const user = await this.retrieveStoredAttributes(userId)
    if (serverId in user.attributes) {
      const encryptedCreds = user.attributes[serverId][0]
      const userIV = await this.getUserIV(user)
      const decryptedCreds = this.decryptData(encryptedCreds, userIV)
      const base64Data = JSON.parse(decryptedCreds).value
      if (base64Data == null) {
        throw new Error('No basic auth creds found for this url')
      }
      const [username, password] = atob(base64Data).split(':')
      return { serverId, username, password }
    } else {
      throw new Error('No basic auth creds found for this url')
    }
  }

  public async getBasicAuthCredsForAllUrls(userId: string) {
    await this.renewKeyCloakToken()
    const userAttributes: KeyCloakUser = await this.retrieveStoredAttributes(userId)
    const userIV: string = await this.getUserIV(userAttributes)
    delete userAttributes?.attributes?.iv
    const serverIds = Object.keys(userAttributes?.attributes || {})
    const creds =
      serverIds.map((terminologyServerId) => {
        const encryptedCreds = userAttributes?.attributes?.[terminologyServerId]?.[0]
        const decryptedCreds = this.decryptData(encryptedCreds, userIV)
        const base64Data = JSON.parse(decryptedCreds).value
        const [username, password] = atob(base64Data).split(':')
        return { terminologyServerId, username, password }
      }) || []

    return creds
  }

  /**
   * Stores basic auth creds for a given url
   */
  public async storeBasicAuthCreds(userId: string, serverId: string, username: string, password: string) {
    await this.renewKeyCloakToken()
    const basicAuthCred = btoa(`${username}:${password}`)
    const userIV = await this.getUserIV(userId)
    const encryptedCreds = this.encryptData(JSON.stringify({ value: basicAuthCred, type: 'basic' }), userIV)
    await this.storeCredsKeyCloak(userId, serverId, encryptedCreds)
  }

  /**
   * Deletes basic auth creds for a given serverId
   * @param userId
   * @param serverId
   */
  public async deleteBasicAuthCreds(userId: string, serverId: string) {
    await this.renewKeyCloakToken()
    await this.deleteCredsKeyCloak(userId, serverId)
    return
  }

  private encryptData(data: string, userIV: string) {
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, Buffer.from(userIV, 'hex'))
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  private decryptData(encryptedData: string, userIV: string) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(userIV, 'hex'))
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  /**
   *
   * @param user accepts either a user attribute keycloak object for a userId string
   * @returns IV string used for decrypting user data
   */
  private async getUserIV(user: string | KeyCloakUser) {
    if (typeof user !== 'string') {
      // Keycloak user object, allow re-use of the attributes without having to fetch them again
      if (user?.attributes?.iv?.[0] == null) {
        const userId = user.id
        // If the user does not have an IV, generate one and store it in Keycloak
        logger.info('IV Not found, Generating IV for user: ' + userId)
        const userIV = crypto.randomBytes(16).toString('hex')
        await this.storeCredsKeyCloak(user, 'iv', userIV)
        return userIV
      } else {
        return user.attributes.iv[0]
      }
    } else {
      const userId = user
      const userAttributes = await this.retrieveStoredAttributes(userId)
      return userAttributes.attributes.iv[0]
    }
  }

  private async retrieveStoredAttributes(userId: string | KeyCloakUser) {
    logger.info('Retrieving stored attributes for userId: ' + userId)
    const url = `${KEYCLOAK_BASE_URL}/admin/realms/aphl/users/${userId}`
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Authorization', `Bearer ${this._cacheJWT}`)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      })
      if (response.status !== 200) {
        throw new Error(`Failed to retrieve user attributes: ${response.statusText}`)
      }
      return response.json()
    } catch (error) {
      logger.error(`Error retrieving attributes for userId: ${userId} from Keycloak: ${error}`)
      this.resetState()
      throw error
    }
  }

  /**
   * Resets the state of the cacheJWT and cacheJWTExpiry
   */
  public resetState() {
    this._cacheJWT = undefined
    this._cacheJWTExpiry = undefined
  }

  private async deleteCredsKeyCloak(userId: string, serverId: string) {
    logger.info(`Deleting creds for serverId: ${serverId} for user: ${userId}`)
    const url = `${KEYCLOAK_BASE_URL}/admin/realms/aphl/users/${userId}`
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Authorization', `Bearer ${this._cacheJWT}`)

    const currentUserAttributes = await this.retrieveStoredAttributes(userId)
    delete currentUserAttributes?.attributes?.[serverId]

    const payload = JSON.stringify({
      ...currentUserAttributes
    })

    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: payload,
        headers
      })
      if (response.status === 204) {
        logger.info(`Successfully deleted creds for serverId: ${serverId}`)
        return response
      } else {
        logger.error(`Failed to delete creds for serverId: ${serverId} in Keycloak: ${response.statusText}`)
        throw new Error(`Failed to delete creds for serverId: ${serverId} in Keycloak: ${response.statusText}`)
      }
    } catch (error) {
      logger.error(`Error deleting creds in Keycloak: ${error}`)
      this.resetState()
      throw error
    }
  }

  private async storeCredsKeyCloak(user: string | KeyCloakUser, key: string, value: string) {
    let userId = ''
    let attributes = null

    if (typeof user !== 'string') {
      // Keycloak user object, allow re-use of the attributes without having to fetch them again
      userId = user.id
      attributes = cloneDeep(user.attributes)
    } else {
      userId = user
    }

    logger.info(`Setting creds '${key}' in Keycloak for user: ${userId}`)
    const url = `${KEYCLOAK_BASE_URL}/admin/realms/aphl/users/${userId}`
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Authorization', `Bearer ${this._cacheJWT}`)

    const currentUserAttributes = attributes == null ? await this.retrieveStoredAttributes(userId) : attributes

    const payload = JSON.stringify({
      ...currentUserAttributes,
      attributes: {
        ...currentUserAttributes.attributes,
        [key]: [value]
      }
    })

    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: payload,
        headers
      })
      if (response.status === 204) {
        logger.info(`Successfully store key: '${key}' in keycloak`)
        return response
      } else {
        logger.error(`Failed to store ${key} in Keycloak: ${response.statusText}`)
        throw new Error(`Failed to store ${key} in Keycloak: ${response.statusText}`)
      }
      ;``
    } catch (error) {
      logger.error(`Error setting API key in Keycloak: ${error}`)
      this.resetState()
      throw error
    }
  }

  private async renewKeyCloakToken() {
    if (this._cacheJWT == null || Date.now() > (this._cacheJWTExpiry || -1)) {
      logger.info('Renewing JWT Token')
      const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`
      const headers = new Headers()
      headers.set('Content-Type', 'application/x-www-form-urlencoded')
      headers.set(
        'Authorization',
        `Basic ${Buffer.from(`${process.env.KEYCLOAK_SERVER_AUTH_ID}:${process.env.KEYCLOAK_SECRET}`).toString('base64')}`
      )
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers
        })
        if (response.status !== 200) {
          throw new Error(`Failed to generate token: ${response.statusText}`)
        }
        const data = await response.json()
        this._cacheJWT = data.access_token
        // expires the token 1 hour before it actually expires to not run into timing issues
        this._cacheJWTExpiry = Date.now() + (data.expires_in - 3600) * 1000
        return data
      } catch (error) {
        logger.error(`Error generating token: ${error}`)
        throw error
      }
    }
  }
}

export default APITokenHandler
