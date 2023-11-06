const buildGroupOptions = (groupVsets: fhir4.ValueSet[] | [] | undefined) => {
  if (
    typeof groupVsets === 'undefined' ||
    Array.isArray(groupVsets) && groupVsets.length === 0
  ) return []

  return groupVsets?.map((g) => ({
    value: g.id || "",
    label: g.title?.replaceAll('_', ' ') || "",
    id: g.id || ""
  }))
}

export {
  buildGroupOptions
}