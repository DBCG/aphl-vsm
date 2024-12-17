import { tsCredentialService } from "@/backend/services/TsCredentialService";
import { NextApiRequest, NextApiResponse } from "next";

const credentials = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('req.query: ', req.query)
  try {
    const { userId } = req.query
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }
    const creds = await tsCredentialService.getAllCredentials(userId as string)
    console.log('creds: ', creds)
    return res.status(200).json(creds)

  } catch (e) {
    console.error('help**', e)
    return res.status(400).json({ error: 'Loading credentials failed' })
  }
}

export default credentials