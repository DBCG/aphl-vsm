const stripFromName = (str: string) => {
  const trimmed = str.trim()

  if (trimmed === '') return trimmed

  const cleaned = trimmed.replace(/[^a-zA-Z0-9\w]/g, '_')
  return cleaned
}

const startsAlphabetically = (title: string) => {
  const regex = /^[A-Za-z]/
  return Boolean(title?.trim().match(regex))
}

const capitalizeFirstLetter = (title: string) => {
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export { stripFromName, startsAlphabetically, capitalizeFirstLetter }
