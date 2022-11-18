import retry from './retryRequest'

describe('retry', () => {
  const delay = 10 // small delay so test runs faster
  const maxRetries = 5

  it('should retry and succeed on third try', async () => {
    const successOnIteration = 3
    let currentIteration = 1

    const testApiFunc = () => {
      return new Promise((resolve, reject) => {
        if (currentIteration === successOnIteration) {
          return resolve("success")
        } else {
          currentIteration = currentIteration + 1
          reject("failure")
        }
      })
    }

    const result = await retry(() => testApiFunc(), maxRetries, delay)
    expect(result).toBe('success')
    expect(currentIteration).toBe(3)
  })

  it('should error out when max retried reached', async () => {
    const failureApiFunc = () => new Promise((_resolve, reject) => reject("failure"))

    await expect(retry(() => failureApiFunc(), maxRetries, delay)).rejects.toThrow("Max retry reached")
  });
})