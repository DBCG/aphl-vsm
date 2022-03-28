// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

const { VSAC_USERNAME, VSAC_API_KEY } = process.env
const authString = `${VSAC_USERNAME}:${VSAC_API_KEY}`
const headers = new Headers();
headers.set('Authorization', `Basic ${Buffer.from(authString).toString('base64')}`)
const fetchOptions = { method: 'GET', headers }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  if (req.method === 'GET') {
    const { baseUrl } = req.query
    if (!baseUrl) { console.error('Please provide a Terminology Server URL')}

    try {
      const response = await fetch(`${baseUrl}/ValueSet?_count=15`, fetchOptions)

      res.status(200).send(await response.json())
    } catch (e) {
      console.error('error:  ', e)
      res.status(400).json({ error: 'Loading ValueSets failed' })
    }
  }
}
