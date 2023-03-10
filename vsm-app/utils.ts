// Usage: await sleep(1000);
export const sleep = (millis: number) => {
  return new Promise((resolve) => setTimeout(resolve, millis))
}
