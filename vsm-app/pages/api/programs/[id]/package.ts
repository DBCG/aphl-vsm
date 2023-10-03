import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/helpers/server/handler';
import { fhirCdrClient } from 'fhirClients';
import { HapiError } from '@/types/hapiError';
import logger from '@/helpers/server/logger';

// this sets approvalDate and date and optionally
// creates an artifactCommentExtension
const crmi_package = async (req: NextApiRequest, res: NextApiResponse<fhir4.Bundle | { error: string; }>): Promise<void> => {
  const { parameters, xml } = JSON.parse(req.body || {}) as { parameters: any; xml: boolean; };
  try {
    const response = (await fhirCdrClient.request(
      `Library/${req.query.id}/$crmi.package?_format=${xml ? "application/fhir+xml" : "application/fhir+json"}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        }
      }
    )) as fhir4.Bundle;
    res.send(response);
  } catch (e: any) {
    const error = e as HapiError;
    logger.error('ERROR: ' + error.response?.data?.issue?.[0]?.code + " : " + error.response?.data?.issue?.[0]?.diagnostics);
    res.status(error.response?.status).json({ error: error.response?.data?.issue?.[0]?.diagnostics || 'unknown' });
  }
};

export default handler({
  POST: {
    action: crmi_package,
    access: ['admin']
  }
});
