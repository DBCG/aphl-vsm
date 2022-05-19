const splitCanonical = (canonical: string): string[] => {
  const [url, version] = canonical?.split('|')
  if (url && version) {
    return [url, version]
  } else {
    return [url]
  }
}

export { splitCanonical }