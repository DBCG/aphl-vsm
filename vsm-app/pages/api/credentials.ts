import { tsCredentialService } from "@/backend/services/TsCredentialService";
import { VSMSession } from "@/helpers/rolesHelper";
import { NextApiRequest, NextApiResponse } from "next";

const credentials = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  try {
    const userId = session.user.id
    const creds = await tsCredentialService.getAllCredentials(userId as string)
    return res.status(200).json(creds)

  } catch (e) {
    return res.status(400).json({ error: 'Loading credentials failed' })
  }
}

export default credentials