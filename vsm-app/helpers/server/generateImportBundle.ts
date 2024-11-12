import { cloneDeep } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

const isSpecLibrary = (someResource) => Boolean(
  someResource?.resourceType === 'Library'
  && (
    someResource?.useContext?.find(
      context => (
        context?.code?.code === 'specification-type'
        && context?.valueCodeableConcept?.coding?.find(c => c?.code === 'program')
      ))
  ))

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
  const jsonObject = arr.map(JSON.stringify)
  const uniqueSet = new Set(jsonObject)
  const uniqueArray = Array.from(uniqueSet).map(JSON.parse)
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


const generateImportBundle = ({ ersdBundle, maxLeafsPerGrouper }) => {
  try {
    // append UUID to owned resource IDs
    const uuidToAppend = uuidv4()

    // also will need to update all versions of the owned resources, and references including version

    const bundleToEdit = cloneDeep(ersdBundle)
  
    if (ersdBundle.resourceType !== 'Bundle') {
      console.log('eRSD data must be in bundle format.')
      return
    }
  
    const specificationLibrary = ersdBundle?.entry?.find(entryItem => {
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
  
    const grouperLibrary = bundleToEdit?.entry?.find(entryItem => {
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
  
    let allLeafReferences = []
    // for each grouper valueset
    grouperValuesetReferences.forEach(ref => {
      const [unversionedGrouperVsUrl, grouperVsVersion] = ref.split('|')
      const matchIndexInEntry = bundleToEdit?.entry?.findIndex((entryItem) => {
        return (
          entryItem?.resource?.url === ref
        )
      })
  
      // get the matching grouper
      const matchingGrouper = bundleToEdit?.entry?.[matchIndexInEntry]?.resource
  
      // consider version match if no version is specified
      const versionMatch = Boolean(!grouperVsVersion || matchingGrouper?.version === grouperVsVersion)
  
      if (matchingGrouper && versionMatch) {
        console.log('typeof maxleafspergrouper', typeof maxLeafsPerGrouper)
        // first, reduce the # of leafs in the grouper if specified
        const updatedGrouper = maxLeafsPerGrouper ? limitLeafsInGrouper(matchingGrouper, maxLeafsPerGrouper) : matchingGrouper
  
        const leafReferencesInGrouper = getLeafReferences(updatedGrouper)
        allLeafReferences = [...allLeafReferences, ...leafReferencesInGrouper]
  
        // remove all codes from the grouper that are not present in the leaf valuesets
        // to do this, must first create a list of all codes present in leafs
        let allCodesFromGrouperLeaves = []
        leafReferencesInGrouper.forEach(leafRef => {
          const [unversionedLeafVsUrl, leafVsVersion] = leafRef.split('|')
          const leafMatchIndexInEntry = bundleToEdit?.entry?.findIndex((entryItem) => {
            return (
              entryItem?.resource?.url === unversionedLeafVsUrl
            )
          })
  
          const matchingLeaf = bundleToEdit?.entry?.[leafMatchIndexInEntry]?.resource
  
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
        bundleToEdit.entry[matchIndexInEntry].resource = updatedGrouper
        // return match
      } else if (!versionMatch) {
        const versionErr = `Version ${grouperVsVersion} does not match any ValueSet in the bundle with url ${unversionedGrouperVsUrl}`
        throw versionErr
      } else {
        const noMatchErr = `No ValueSet in the bundle with url ${unversionedGrouperVsUrl}`
        throw noMatchErr
      }
      return
    })
    // remove all valuesets that are not directly referenced by the program and grouper leafs
    // the current ersd has no difference in useContext (both are reporting: triggering) so this isn't ideal
    // it could catch other valuesets if they are not directly referenced by the program or grouper leafs in the future
    const allUnversionedLeafReferencesToKeep = [...grouperValuesetReferences, ...allLeafReferences]?.map(ref => ref.split('|')[0])
  
    // delete all valuesets that are not directly referenced by the program and grouper leafs
    bundleToEdit.entry = bundleToEdit.entry.filter(entryItem => {
      return entryItem.resource.resourceType !== 'ValueSet' || allUnversionedLeafReferencesToKeep.includes(entryItem?.resource?.url)
    })

    const result = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'appAuthoritativeUrl',
          valueUri: 'http://a88ebe212beb245098a829c6616a4850-1737523659.us-east-1.elb.amazonaws.com/fhir'
        },
        {
          name: 'bundle',
          resource: bundleToEdit
        }
      ]
    }
    // return edited bundle
    return result
  } catch (e) {
    console.error(e)
    // return error to be displayed to user in UI
    return { error: e }
  }
}

export { generateImportBundle }