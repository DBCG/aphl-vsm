
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
 * Retry Wrapper Function for flakey API Calls
 * @param apiCall 
 * @param maxRetries 
 * @param delay 
 * @returns 
 */
const retry = async (apiCall: Function, maxRetries = 3, delay = 1000) => {
  let error: ErrorOptions | undefined
  for (let i = 0; i < maxRetries; i++) {
    console.log(i, "try with delay:", delay* i)
    try {
      const results = await apiCall()
      return results
    } catch(e: any) {
      error = e
      await wait(delay * i)
    }
  }
  throw new Error("Max retry reached", error)
}

export default retry