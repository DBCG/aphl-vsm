import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/helpers/server/handler';
import { fhirCdrClient } from 'fhirClients';
import { HapiError } from '@/types/hapiError';
import logger from '@/helpers/server/logger';
import { AuthOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from 'next-auth';


// this sets approvalDate and date and optionally
// creates an artifactCommentExtension
const approve = async (req: NextApiRequest, res: NextApiResponse<fhir4.Library | { error: string; }>): Promise<void> => {
  const parameters = JSON.parse(req.body || {});
  const session = await getServerSession(req, res, AuthOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const approvalUser = {
    name: 'artifactCommentUser',
    valueReference: {
      reference: userEmail
    }
  };
  parameters?.parameter?.push(approvalUser);

  try {
    const response = (await fhirCdrClient.operation({
      name: '$crmi.approve',
      resourceType: 'Library',
      id: req.query.id as string,
      method: 'POST',
      input: parameters
    })) as fhir4.Library;
    res.send(response);
  } catch (e: any) {
    const error = e as HapiError;
    logger.error('ERROR: ' + error.response?.data?.issue?.[0]?.code + " : " + error.response?.data?.issue?.[0]?.diagnostics);
    res.status(error.response?.status).json({ error: error.response?.data?.issue?.[0]?.diagnostics || 'unknown' });
  }
};

export default handler({
  POST: {
    action: approve,
    access: ['admin']
  }
});
