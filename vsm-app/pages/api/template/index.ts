import type { NextApiRequest, NextApiResponse } from 'next';
import { latestVersion } from '@/helpers/server/semverHelpers';
import handler from '@/helpers/server/handler';
import logger from '@/helpers/server/logger';
import { fhirCdrClient } from '@/fhirClients';
import { logSimpleHapiError } from '@/helpers/server/simpleHapiError';
import { incrementSemver } from '@/utils';
import { HapiError } from '@/types/hapiError';
import { is } from '@/helpers/is';

interface ResponseItem {
  status: string;
  location: string;
  etag: string;
  lastModified: string;
}

type DraftCreateResponse = fhir4.Bundle & { type: 'transaction-response'; } & { entry: ResponseItem[]; } | fhir4.OperationOutcome | null;

// this code ingests a FHIR Library, and will POST a modified clone as a template
const setDraft = async (req: NextApiRequest, res: NextApiResponse) => {
  // create library template
  try {
    const latestProgram = await fhirCdrClient.search({
      resourceType: 'Library',
      searchParams: {
        url: 'http://ersd.aimsplatform.org/fhir/Library/SpecificationLibrary',
        _sort: ['-version'],
        _count: 1
      }
    });

    let body = JSON.parse(req.body);
    const semverFromTemplateProgram = body?.version;

    const latestSemverFromCdr = latestProgram
      ?.entry?.[0]?.resource?.version;

    const latestIncrementedVersion = incrementSemver({
      valueToIncrement: latestVersion(latestSemverFromCdr, semverFromTemplateProgram),
      incrementType: 'minor',
      fallbackValue: '1.0.0.0'
    });

    let versionToAttempt = latestIncrementedVersion;

    // side effect to increment the above fn
    const incrementVersionToAttempt = () => {
      versionToAttempt = incrementSemver({
        valueToIncrement: versionToAttempt,
        incrementType: 'minor',
        fallbackValue: '1.0.0.0'
      });
    };

    // try to increment versions totalAttempts times before failing out
    // in case there are 422 (already exist collisions)
    const totalAttempts = 30;
    let attempts = totalAttempts;

    const createDraftWithNewVersion = async (): Promise<DraftCreateResponse> => {
      let response;

      logger.info(`attempt #${totalAttempts - (attempts - 1)} out of ${totalAttempts} for $draft. Trying version ${versionToAttempt}`);

      try {
        const parameters = {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'version',
              valueString: versionToAttempt
            }
          ]
        } as fhir4.Parameters;

        const clientResponse = await fhirCdrClient.operation({
          name: '$crmi.draft',
          method: 'POST',
          id: `Library/${body.id}`,
          options: {
            headers: {
              'content-type': 'application/json'
            }
          },
          input: JSON.stringify(parameters)
        });

        if (!clientResponse?.entry?.length && attempts > 0) {
          logger.error(`Error: could not $draft Library/${body.id} with version ${versionToAttempt}. Attempt #${attempts}/5.`);
          attempts = attempts - 1;
          incrementVersionToAttempt();
          return await createDraftWithNewVersion();
        } else {
          response = clientResponse;
        }
      } catch (e: HapiError | any) {
        if (is.operationOutcome(e?.response?.data) && attempts > 0) {
          incrementVersionToAttempt();
          attempts = attempts - 1;
          return await createDraftWithNewVersion();
        } else {
          // looooooop
          incrementVersionToAttempt();
          return await createDraftWithNewVersion();
        }
      }
      // final return of response if nothing catches
      return response;
    };

    const draftResponse = await createDraftWithNewVersion(); // either null or a response

    if (!is.operationOutcome(draftResponse) && draftResponse?.entry?.length) {
      return res.status(200).json({ message: 'Successfully drafted' });
    } else {
      return res.status(400).json({ message: 'Failed to clone Library.' });
    }
  } catch (e) {
    logSimpleHapiError(e);
    return res.status(400).json({ message: 'Creation of new Library failed here.' });
  }

};

export default handler({
  POST: {
    action: setDraft,
    access: ['admin', 'editor']
  }
});
