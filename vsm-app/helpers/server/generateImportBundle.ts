// @ts-nocheck
import { cloneDeep } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

const isSpecLibrary = (someResource: any) => Boolean(
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

const getLeafReferences = (grouperValueset: fhir4.ValueSet) => {
  if (grouperIsUnionOfValueSets(grouperValueset)) {
    return grouperValueset.compose!.include[0].valueSet
  } else {
    return grouperValueset.compose!.include.map(includeItem => includeItem?.valueSet?.[0])
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

const getSpecificationLibIndex = (bundle) => {
  return bundle?.entry?.findIndex(entryItem => {
    return isSpecLibrary(entryItem?.resource)
  })
}

const generateImportBundle = ({ ersdBundle, maxLeafsPerGrouper, versionToUse }) => {
  try {
    // append UUID to owned resource IDs
    const uuidToAppend = uuidv4()

    // also will need to update all versions of the owned resources, and references including version

    const bundleToEdit = cloneDeep(ersdBundle)
  
    if (ersdBundle.resourceType !== 'Bundle') {
      console.log('eRSD data must be in bundle format.')
      return
    }
  

    let specificationLibraryIndex = getSpecificationLibIndex(bundleToEdit)
    const specificationLibrary = ersdBundle?.entry?.[specificationLibraryIndex]?.resource
  
    const grouperLibReference = specificationLibrary
      ?.relatedArtifact
      ?.find(artifact => (
        artifact?.type === 'composed-of' && artifact?.resource?.includes('/Library/')
      ))?.resource
    
      const planDefReference = specificationLibrary
        ?.relatedArtifact
        ?.find(artifact => (
          artifact?.type === 'composed-of' && artifact?.resource?.includes('/PlanDefinition/')
        ))?.resource
  
    if (typeof grouperLibReference !== 'string') {
      const errText = 'No grouper library reference found in the bundle.'
      console.error(errText)
      throw errText
    } else if (typeof planDefReference !== 'string') {
      const errText = 'No plan definition reference found in the bundle.' 
      console.error(errText)
      throw errText
    }
  
    const unversionedGrouperLibUrl = grouperLibReference.split('|')[0]
    
    let grouperLibraryIndex = bundleToEdit?.entry?.findIndex(entryItem => {
      return entryItem?.resource?.url === unversionedGrouperLibUrl
    })
    
    const grouperLibrary = bundleToEdit?.entry?.[grouperLibraryIndex]?.resource
    
    if (!grouperLibrary) {
      const errText = 'No grouper library found in the bundle.' 
      console.error(errText)
      throw errText
    }

    const unversionedPlanDefUrl = planDefReference.split('|')[0]
  
    const grouperValuesetReferences = grouperLibrary?.relatedArtifact?.filter(
      artifact => artifact?.type === 'composed-of' && artifact?.resource?.includes('/ValueSet/')
    )?.map(i => i?.resource)?.filter(x => !!x)
  
  
    if (!grouperValuesetReferences || grouperValuesetReferences.length === 0) {
      const errText = 'No grouper value set references found in the bundle.'
      console.error(errText)
      throw errText
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
            const errText = `No ValueSet in the bundle with url ${leafRef}`
            console.error(errText)
            throw errText
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
  
    bundleToEdit.id = `${bundleToEdit.id}-${uuidToAppend}`

    // delete all valuesets that are not directly referenced by the program and grouper leafs
    // this will change the indices
    bundleToEdit.entry = bundleToEdit.entry.filter(entryItem => {
      return entryItem.resource.resourceType !== 'ValueSet' || allUnversionedLeafReferencesToKeep.includes(entryItem?.resource?.url)
    })

    specificationLibraryIndex = getSpecificationLibIndex(bundleToEdit)
    const planDefinitionIndex = bundleToEdit?.entry?.findIndex(entryItem => {
      return entryItem?.resource?.url === unversionedPlanDefUrl
    })

     grouperLibraryIndex = bundleToEdit?.entry?.findIndex(entryItem => {
      return entryItem?.resource?.url === unversionedGrouperLibUrl
    })

    const grouperVsIndicesInEntry = [] as number[]
    grouperValuesetReferences.forEach(ref => {
      const matchIndexInEntry = bundleToEdit?.entry?.findIndex((entryItem) => {
        return (
          entryItem?.resource?.url === ref
        )
      })

      if (matchIndexInEntry !== -1) {
        grouperVsIndicesInEntry.push(matchIndexInEntry)
      }
    })

    // update spec library version
    bundleToEdit.entry[specificationLibraryIndex].fullUrl = `${bundleToEdit.entry[specificationLibraryIndex].fullUrl}-${uuidToAppend}`
    const specLibToEdit = cloneDeep(specificationLibrary)
    specLibToEdit.version = versionToUse
    specLibToEdit.id = `${specLibToEdit.id}-${uuidToAppend}`
    // set changes on spec library resource
    bundleToEdit.entry[specificationLibraryIndex].resource = specLibToEdit

    // update references to planDefinition and grouper library
    bundleToEdit.entry[specificationLibraryIndex].resource.relatedArtifact = specificationLibrary.relatedArtifact.map(ra => {
      if (ra.resource.includes('/Library/') || ra.resource.includes('/ValueSet/')) {
        const raToEdit = cloneDeep(ra)
        const [raUrl, raVersion] = ra.resource.split('|')

        const updatedResourceUrl = `${raUrl}-${uuidToAppend}${raVersion ? `|${versionToUse}` : ''}`
        raToEdit.resource = updatedResourceUrl
      } else {
        return ra
      }
    })

    // handle other relatedArtifacts? for instance, if conditions exist

    // update PlanDefinition
    bundleToEdit.entry[planDefinitionIndex].fullUrl = `${bundleToEdit.entry[planDefinitionIndex].fullUrl}-${uuidToAppend}`
    const planDefToEdit = bundleToEdit.entry[planDefinitionIndex].resource
    planDefToEdit.version = versionToUse
    planDefToEdit.id = `${planDefToEdit.id}-${uuidToAppend}`
    // set changes on planDef resource
    bundleToEdit.entry[planDefinitionIndex].resource = planDefToEdit 
    // update grouper library
    bundleToEdit.entry[grouperLibraryIndex].fullUrl = `${bundleToEdit.entry[grouperLibraryIndex].fullUrl}-${uuidToAppend}`
    const grouperLibToEdit = bundleToEdit.entry[grouperLibraryIndex].resource
    grouperLibToEdit.version = versionToUse
    grouperLibToEdit.id = `${grouperLibToEdit.id}-${uuidToAppend}`
    // update references to grouper valuesets
    const raToEdit = cloneDeep(grouperLibToEdit.relatedArtifact)
    const newRa = raToEdit.map(ra => {
      if (ra.type === 'composed-of' && ra.resource.includes('/ValueSet/')) {
        const [raUrl, raVersion] = ra.resource.split('|')
        const updatedResourceUrl = `${raUrl}-${uuidToAppend}${raVersion ? `|${versionToUse}` : ''}`
        ra.resource = updatedResourceUrl
        return ra
      } else {
        return ra
      }
    })
    // set relatedArtifact on grouper library
    grouperLibToEdit.relatedArtifact = newRa
    // set changes on grouper lib resource
    bundleToEdit.entry[grouperLibraryIndex].resource = grouperLibToEdit  

    // finally, update grouper valuesets
    grouperVsIndicesInEntry.forEach((grouperVsIndex) => {
      bundleToEdit.entry[grouperVsIndex].fullUrl = `${bundleToEdit.entry[grouperVsIndex].fullUrl}-${uuidToAppend}`
      const grouperVsToEdit = bundleToEdit.entry[grouperVsIndex].resource
      grouperVsToEdit.version = versionToUse
      grouperVsToEdit.id = `${grouperVsToEdit.id}-${uuidToAppend}`
      bundleToEdit.entry[grouperVsIndex].resource = grouperVsToEdit
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
    return result as fhir4.Bundle
  } catch (e) {
    console.error(e)
    // return error to be displayed to user in UI
    return { error: e }
  }
}

export { generateImportBundle }