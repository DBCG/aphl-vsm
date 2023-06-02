import createCache from "@emotion/cache";

// https://blog.logrocket.com/getting-started-with-mui-and-next-js/

export default function createEmotionCache() {
  return createCache({ key: "css", prepend: true });
}