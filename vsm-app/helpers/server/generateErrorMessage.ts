import { is } from '../is'
import { hapiErrorCodes } from './hapiErrorCodes'

interface ErrorInfo {
  serverResponse: fhir4.OperationOutcome | any
  defaultErrorMessage: string
}

const generateErrorMessage = ({
  serverResponse,
  defaultErrorMessage
}: ErrorInfo) => {
  let errorMessage = defaultErrorMessage

  if(is.operationOutcome(serverResponse)) {
    const hapiDiagnosticsMessage = serverResponse?.issue?.[0]
      ?.diagnostics?.toUpperCase() || ''
  
    const hapiErrCodeList = Object.keys(hapiErrorCodes) as Array<keyof typeof hapiErrorCodes>
  
    const matchingErrorCode = hapiErrCodeList?.find(code => (
      hapiDiagnosticsMessage?.includes(code)
    ))

    if (matchingErrorCode) {
      errorMessage = hapiErrorCodes[matchingErrorCode].message
    }
  }
  return errorMessage
}

export { generateErrorMessage }