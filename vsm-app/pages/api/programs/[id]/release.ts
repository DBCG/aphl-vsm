import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/helpers/server/handler';
import logger from '@/helpers/server/logger';
import { fhirCdrClient } from '@/fhirClients';
import { removeDraftFromVersionString } from '@/utils';

// this only gets the program library
const release = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const toReleaseLibrary = JSON.parse(req?.body);
  try {
    await fhirCdrClient.update<fhir4.Library>({
      resourceType: 'Library',
      id: toReleaseLibrary.id as string,
      body: toReleaseLibrary
    });
  } catch (e) {
    logger.error('error', e);
    return res.status(500).json({ error: 'Error updating program by ID' });
  }
  const releasePayload = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'version',
        valueString: removeDraftFromVersionString(toReleaseLibrary?.version)
      },
      {
        name: 'versionBehavior',
        valueCode: 'default'
      }
    ]
  };

  const response = await fhirCdrClient.operation({
    name: '$crmi.release',
    resourceType: 'Library',
    id: req.query.id as string,
    method: 'POST',
    input: releasePayload
  });

  if (!response.entry) {
    console.error('res here: ', response);
    logger.error('error', response.status, response.statusText);
    return res.status(response.status || 500).json({ error: response.statusText });
  }

  return res.status(200).send({});
};

export default handler({
  POST: {
    action: release,
    access: ['admin', 'editor']
  }
});
