import set from 'lodash.set'

const addValueSetToGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let leafVSetsInGroup = vs?.compose?.include?.[0]?.valueSet || []
  if (!leafVSetsInGroup.length) {
    // need to make a new path
    const path = 'compose.include[0].valueSet'
    const valueToAdd = [vsCanonical]
    set(vs, path, valueToAdd)
  } else {
    if (!leafVSetsInGroup.includes(vsCanonical)) {
      leafVSetsInGroup.push(vsCanonical)
      if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
        vs.compose.include[0].valueSet = leafVSetsInGroup
      }
    }
  }
  return vs
}

const removeValueSetFromGrouper = (vs: fhir4.ValueSet, vsCanonical: string): fhir4.ValueSet => {
  let leafVsInGroup = vs.compose?.include?.[0]?.valueSet
  if (leafVsInGroup) {
    const updatedLeafVsInGroup = vs?.compose?.include?.[0]?.valueSet
      ?.filter(leafCanonical => leafCanonical !== vsCanonical)

    if (vs?.compose?.include?.[0]?.valueSet !== undefined) {
      vs.compose.include[0].valueSet = updatedLeafVsInGroup
    }
  } else {
    console.error('no leaf valuesets exist in this group')
  }
  return vs
}

// this only handles extensions with valueUri as type for now
const addExtensionToVs = (vs: fhir4.ValueSet, extensionUri: string, extensionValue: string): fhir4.ValueSet => {
  const valueToAdd = {
    url: extensionUri,
    valueUri: extensionValue
  }

  if (vs?.extension) {
    // if this extension already exists
    if (vs?.extension?.find(ext => ext?.url === extensionUri)) {
      return vs
    } else {
      vs.extension.push(valueToAdd)
    }
  } else {
    vs.extension = [valueToAdd]
  }
  return vs
}

export { addValueSetToGrouper, removeValueSetFromGrouper, addExtensionToVs }