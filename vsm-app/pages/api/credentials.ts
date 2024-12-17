import { tsCredentialService } from "@/backend/services/TsCredentialService";
import { NextApiRequest, NextApiResponse } from "next";

const credentials = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { userId } = req.query
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }
    const creds = await tsCredentialService.getAllCredentials(userId as string)
    return res.status(200).json(creds)

  } catch (e) {
    return res.status(400).json({ error: 'Loading credentials failed' })
  }
}

export default credentials