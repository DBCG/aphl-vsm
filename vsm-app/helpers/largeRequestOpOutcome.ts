import { MAX_POST_CONTENT_SIZE_BYTES } from "@/pages/api/fhir/[[...params]]";

const bytesPerMB = 1000000

const generateLargeRequestOpOutcome = (jobId?: string) => {
  const baseText = `VSM FHIR API: API requests with content-lengths greater than ${MAX_POST_CONTENT_SIZE_BYTES/bytesPerMB} MB will continue in the background.`
  const diagnosticsText = jobId ? `${baseText} Job ID: ${jobId}` : baseText

  return (
    {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'information',
          code: 'informational',
          diagnostics: diagnosticsText
        }
      ]
    }
  )
}

export { generateLargeRequestOpOutcome }