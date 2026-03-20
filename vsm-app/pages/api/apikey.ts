import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/helpers/server/handler";
import APITokenHandler from "@/helpers/server/ApiTokenHandler";
import { VSMSession } from '@/helpers/rolesHelper'

const getMaskedSecret = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const maskedSecret = await APITokenHandler.getInstance().getMaskSecret(session?.user?.id)
  if (!maskedSecret) {
    return res.status(404).json({ error: "No API Key found" });
  }
  return res.status(200).json({ maskedSecret });
};

const generateSecret = async (req: NextApiRequest, res: NextApiResponse, session: VSMSession) => {
  const newSecret = await APITokenHandler.getInstance().generateApiKey(session?.user?.id, session?.user?.roles || []);
  if (!newSecret) {
    return res.status(500).json({ error: "Failed to generate new API Key" });
  }
  return res.status(200).json({ newSecret });
}

export default handler({
  GET: { action: getMaskedSecret, access: ['admin', 'publisher']},
  POST: {action: generateSecret, access: ['admin', 'publisher']}
});
