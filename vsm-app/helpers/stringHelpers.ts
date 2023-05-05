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

function detectSemanticVersion(str: string) {
  const pattern = /\b\d+\.\d+\.\d+\b/;  // Regex pattern to match semantic versioning
  const match = str.match(pattern);

  if (match) {
    return match[0];
  } else {
    return null;
  }
}

export { stripFromName, startsAlphabetically, capitalizeFirstLetter, detectSemanticVersion }
