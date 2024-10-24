// to run this, cd into the /bin directory and run `node generate-smaller-ersd.js`

const fs = require('fs')

// configuration
const MAX_VS_PER_GROUPER = 5
const GENERATE_3_PART_VERSION = true

// starting file to edit
const ersdWithFourPartVersion = 'ersd-1.2.2.0-bundle.json'
const fileToEdit = JSON.parse(fs.readFileSync(ersdWithFourPartVersion).toString())

// files to be generated
const smallerBundle4PartVersion = 'ersd-1.2.2.0-smaller-four-part-version-bundle.json'
const smallerBundle3PartVersion = 'ersd-1.2.2-smaller-three-part-version-bundle.json'

const isSpecLibrary = (someResource) => Boolean(
  someResource?.resourceType === 'Library'
  && (
    someResource?.useContext?.find(
      context => (
        context?.code?.code === 'specification-type'
        && context?.valueCodeableConcept?.coding?.find(c => c?.code === 'program')
      ))
  ))

if (fileToEdit.resourceType !== 'Bundle') {
  console.log('eRSD data must be in bundle format.')
  return
}

const specificationLibrary = fileToEdit?.entry?.find(entryItem => {
  return isSpecLibrary(entryItem?.resource)
}).resource

const grouperLibReference = specificationLibrary
  ?.relatedArtifact
  ?.find(artifact => (
    artifact?.type === 'composed-of' && artifact?.resource?.includes('/Library/')
  ))?.resource


if (typeof grouperLibReference !== 'string') {
  console.error('No grouper library reference found in the bundle.')
  return
}

const unversionedGrouperLibUrl = grouperLibReference.split('|')[0]

const grouperLibrary = fileToEdit?.entry?.find(entryItem => {
  return entryItem?.resource?.url === unversionedGrouperLibUrl
})?.resource

if (!grouperLibrary) {
  console.error('No grouper library found in the bundle.')
  return
}

const grouperValuesetReferences = grouperLibrary?.relatedArtifact?.filter(
  artifact => artifact?.type === 'composed-of' && artifact?.resource?.includes('/ValueSet/')
)?.map(i => i?.resource)?.filter(x => !!x)


if (!grouperValuesetReferences || grouperValuesetReferences.length === 0) {
  console.error('No grouper value set references found in the bundle.')
  return
}

const grouperIsUnionOfValueSets = (grouperValueSet) => Boolean(
  grouperValueSet?.compose?.include?.length === 1
  && grouperValueSet?.compose?.include[0]?.valueSet?.length > 1
)

const getLeafReferences = (grouperValueset) => {
  if (grouperIsUnionOfValueSets(grouperValueset)) {
    return grouperValueset.compose.include[0].valueSet
  } else {
    return grouperValueset.compose.include.map(includeItem => includeItem.valueSet[0])
  }
}

const dedupeArrayOfObjects = (arr) => {
  jsonObject = arr.map(JSON.stringify)
  uniqueSet = new Set(jsonObject)
  uniqueArray = Array.from(uniqueSet).map(JSON.parse)
  return uniqueArray
}

const limitLeafsInGrouper = (grouperValueset, maxNumber) => {
  if (grouperIsUnionOfValueSets(grouperValueset)) {
    console.info(`The grouper value set ${grouperValueset.url} is structured as an intersection of ValueSet contents.`)
    console.info(`In published eRSDs, this is an implementation error.`)
    console.info(`This script assumes the user means to get all of the contents from the list of ValueSets (union), not just what they have in common (intersection).`)
    console.info(`*********************************************`)
    grouperValueset.compose.include[0].valueSet = grouperValueset.compose.include[0].valueSet.slice(0, maxNumber)
  } else {
    grouperValueset.compose.include = grouperValueset.compose.include.slice(0, maxNumber)
  }
  return grouperValueset
}

const flattenLeafData = (composeIncludeArr) => {
  const allCodes = []
  composeIncludeArr.forEach(includeItem => {
    const codeSystem = includeItem?.system
    const codeVersion = includeItem?.version
    includeItem.concept.forEach(concept => {
      allCodes.push({
        system: codeSystem,
        version: codeVersion,
        code: concept.code
      })
    })
  })
  return allCodes
}

const allCodesFromLeafsInGrouper = (leafReferences) => {
  // structure in groupers expansion: contains[{system: '', version: '', code: ''}]
  // structure in leafs: compose: {include: [{system: '', version: '', concept: [{code: ''}]}]}

  // step 1: get all codes from leafs in grouper
  // step 2: remove all codes from grouper that are not present in leafs
  // place grouper in bundle
  const allCodesInGrouper = []

  leafReferences.forEach(leafRef => {
    const matchIndexInEntry = fileToEdit?.entry?.findIndex((entryItem) => {
      return (
        entryItem?.resource?.url === leafRef
      )
    })

    const matchingLeaf = fileToEdit?.entry?.[matchIndexInEntry]?.resource

    if (matchingLeaf) {
      matchingLeaf.compose.include.forEach(newIncludeItem => {
        const indexOfCachedSystem = allCodesInGrouper.findIndex(item => (
          item.system === newIncludeItem.system
          && item.version === newIncludeItem.version
        ))
        if (indexOfCachedSystem > -1) {
          const codesAlreadyCached = allCodesInGrouper[indexOfMatch].concept.map(concept => concept.code)
          const dedupedItemsToAdd = [...composeIncludeItems[indexOfMatch].concept, ...includeItem.concept].filter(concept => !codesAlreadyCached.includes(concept.code))
          composeIncludeItems[indexOfMatch].concept = dedupedItemsToAdd
        } else {
          composeIncludeItems.push(newIncludeItem)
        }
      })
    } else {
      console.error(`No ValueSet in the bundle with url ${leafRef}`)
    }
  })
  return allCodesInGrouper
}

let allLeafReferences = []
// for each grouper valueset
grouperValuesetReferences.forEach(ref => {
  const [unversionedGrouperVsUrl, grouperVsVersion] = ref.split('|')
  const matchIndexInEntry = fileToEdit?.entry?.findIndex((entryItem) => {
    return (
      entryItem?.resource?.url === ref
    )
  })

  // get the matching grouper
  const matchingGrouper = fileToEdit?.entry?.[matchIndexInEntry]?.resource

  // consider version match if no version is specified
  const versionMatch = Boolean(!grouperVsVersion || resourceWithMatchingUrl?.version === grouperVsVersion)

  if (matchingGrouper && versionMatch) {
    // first, reduce the # of leafs in the grouper
    const updatedGrouper = limitLeafsInGrouper(matchingGrouper, MAX_VS_PER_GROUPER)

    const leafReferencesInGrouper = getLeafReferences(updatedGrouper)
    allLeafReferences = [...allLeafReferences, ...leafReferencesInGrouper]

    // remove all codes from the grouper that are not present in the leaf valuesets
    // to do this, must first create a list of all codes present in leafs
    let allCodesFromGrouperLeaves = []
    leafReferencesInGrouper.forEach(leafRef => {
      const [unversionedLeafVsUrl, leafVsVersion] = leafRef.split('|')
      const leafMatchIndexInEntry = fileToEdit?.entry?.findIndex((entryItem) => {
        return (
          entryItem?.resource?.url === unversionedLeafVsUrl
        )
      })

      const matchingLeaf = fileToEdit?.entry?.[leafMatchIndexInEntry]?.resource

      if (matchingLeaf) {
        allCodesFromGrouperLeaves = [...allCodesFromGrouperLeaves, ...(flattenLeafData(matchingLeaf.compose.include))]
      } else {
        console.error(`No ValueSet in the bundle with url ${leafRef}`)
      }
    })
    // dedupe codes just in case
    const dedupedCodesFromGrouperLeaves = dedupeArrayOfObjects(allCodesFromGrouperLeaves)
    // now, remove all codes from the grouper that are not present in the leaf valuesets
    const updatedGrouperExpansion = updatedGrouper.expansion.contains.filter(grouperContainsItem => {
      // const updatedConcepts = includeItem.concept.filter(concept => {
        return dedupedCodesFromGrouperLeaves.some(code => {
          return code.system === grouperContainsItem.system
            && code.version === grouperContainsItem.version
            && code.code === grouperContainsItem.code
        })
    })

    updatedGrouper.expansion.contains = updatedGrouperExpansion

    // // get references to leaf valuesets left in the grouper
    // allLeafReferences = Array.from(new Set([...allLeafReferences, ...getLeafReferences(updatedGrouper)]))
    // get all codes present in the leaf valuesets
    fileToEdit.entry[matchIndexInEntry].resource = updatedGrouper
    // return match
  } else if (match && !versionMatch) {
    console.error(`Version ${grouperVsVersion} does not match any ValueSet in the bundle with url ${unversionedGrouperVsUrl}`)
  } else {
    console.error(`No ValueSet in the bundle with url ${unversionedGrouperVsUrl}`)
  }
  return
})

// remove all valuesets that are not directly referenced by the program and grouper leafs
// the current ersd has no difference in useContext (both are reporting: triggering) so this isn't ideal
// it could catch other valuesets if they are not directly referenced by the program or grouper leafs in the future
const allUnversionedLeafReferencesToKeep = [...grouperValuesetReferences, ...allLeafReferences]?.map(ref => ref.split('|')[0])

// delete all valuesets that are not directly referenced by the program and grouper leafs
fileToEdit.entry = fileToEdit.entry.filter(entryItem => {
  return entryItem.resource.resourceType !== 'ValueSet' || allUnversionedLeafReferencesToKeep.includes(entryItem?.resource?.url)
})

const json = JSON.stringify(fileToEdit)


if (GENERATE_3_PART_VERSION) {
  // generate file for 3-part version
  const versionToEdit = specificationLibrary.version.split('.')
  if (versionToEdit.length < 3) {
    console.error(`Spec Library version: ${specificationLibrary.version}`)
    console.error('Starting version number must have at least 3 parts to be reasonably sure the regex is targeting the right thing.')
  } else {
    const newVersion = versionToEdit.slice(0, 3).join('.')
    const editedJson = json.replaceAll(specificationLibrary.version, newVersion)
    fs.writeFileSync(smallerBundle3PartVersion, JSON.stringify(editedJson))
  }
}

// write file for 4-part version
fs.writeFileSync(smallerBundle4PartVersion, json)