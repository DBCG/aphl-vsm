/**
 * Adds delay to function call
 * @param ms
 * @returns
 */
const wait = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Retry Wrapper Function for flakey API Calls with backoff delays
 * @param apiCall
 * @param maxRetries
 * @param delay
 * @returns
 */
const retry = async (apiCall: Function, maxRetries = 3, delay = 500) => {
  let error: ErrorOptions | undefined
  for (let i = 0; i < maxRetries; i++) {
    try {
      const results = await apiCall()
      return results
    } catch (e: any) {
      error = e
      await wait(delay * i)
    }
  }
  console.error(`Error for API Call: ${apiCall} after ${maxRetries} retries`)
  throw new Error('Max retry reached', error)
}

export default retry
