const dedupeArray = (arr: string[]) => {
  return Array.from(new Set(arr))
}

export { dedupeArray }
