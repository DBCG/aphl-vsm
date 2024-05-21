import { get, uniq } from 'lodash'

const rootLibDataPaths = {
  id: {
    old: [
      'oldData.id.value',
      'newData.id.operation.oldValue'
    ],
    new: [
      'newData.value',
      'oldData.id.operation.newValue'
    ]
  },
  name: {
    old: [
      'oldData.name.value',
      'newData.name.operation.oldValue'
    ],
    new: [
      'newData.name.value',
      'oldData.name.operation.newValue' 
    ]
  },
  version: {
    old: [
      'oldData.version.value',
      'newData.version.operation.oldValue'
    ],
    new: [
      'newData.version.value',
      'oldData.version.operation.newValue'
    ]
  },
  purpose: {
    old: [
      'oldData.purpose.value',
      'newData.purpose.operation.oldValue'
    ],
    new: [
      'newData.purpose.value',
      'oldData.purpose.operation.newValue'
    ]
  },
  effectiveStart: {
    old: [
      'oldData.effectiveStart.value',
      'newData.effectiveStart.operation.oldValue'
    ],
    new: [
      'newData.effectiveStart.value',
      'oldData.effectiveStart.operation.newValue'
    ]
  },
  releaseDate: {
    old: [
      'oldData.releaseDate.value',
      'newData.releaseDate.operation.oldValue'
    ],
    new: [
      'newData.releaseDate.value',
      'oldData.releaseDate.operation.newValue'
    ]
  }
}

const getValue = (path, oldData, newData) => {
  if (path.startsWith('oldData')) {
    const p = path.split('oldData.')[1]
    return get(oldData.oldData, p)
  } else if (path.startsWith('newData')) {
    const p = path.split('oldData.')[1]
    return get(newData.newData, p) 
  }
}

const generateRootTableData = (oldData, newData) => {
  const result = {
    id: ['', ''],
    name: ['', ''],
    version: ['', ''],
    purpose: ['', ''],
    effectiveStart: ['', ''],
    releaseDate: ['', '']
  }

  const colTitles = Object.keys(rootLibDataPaths)
  colTitles.forEach((title) => {

    const oldVal = rootLibDataPaths[title].old
      .map(path => getValue(path, oldData, newData))
      .filter(x => x)[0]
    
    const newVal = rootLibDataPaths[title].new
      .map(path => getValue(path, oldData, newData))
      .filter(x => x)[0]

    result[title] = [oldVal, newVal]
  })
  return result
}

const generatePlanDefinitionData = () => {
  // ?
}

// grouper metadata only cares about the newest info
// RCKMS says they don't really care to compare grouper old/new metadata values
const generateGrouperMetadata = (grouperPage) => {
  const newData = grouperPage.newData

  const paths = {
    id: 'id.value',
    title: 'title.value',
    version: 'version.value',
    codeSystems: 'codes'
  }

  const grouperMetadata = () => {
    let result = {}
    const keys = Object.keys(paths)
    keys.forEach(k => {
      if (k === 'codeSystems') {
        const uniqueSystems = Array.from(new Set(newData.codes
          .filter(c => c?.operation !== 'delete')
          .map(i => i.system)))
          result[k] = uniqueSystems
      } else {
        result[k] = get(newData, paths[k])
      }
    })
    return result
  }
  return grouperMetadata()
}

const generateMainChangeText = (grouperListItem) => {
  const allConditionChangeTypes = uniq(grouperListItem.conditions
    .filter(c => c?.operation)
    .map(i => i?.operation?.type))

  // incomplete possibilities
  if (grouperListItem?.operation?.type === 'insert') {
    return 'Added VS'
  } else if (grouperListItem?.operation?.type === 'delete') {
    return 'Removed VS'
  } else if (allConditionChangeTypes.find(c => c === 'replace')) {
    return 'Update Conditions'
  } else if (allConditionChangeTypes.length == 1) {
    return `${allConditionChangeTypes[0]} Conditions`
  } else {
    return 'Unidentified change' // ?
  }
}

// conditions can be added, removed, or updated
// could be updates to code, text, system
// might need to combine multiple "replace" fields
const generateConditionUpdates = (conditionsList) => {
  return conditionsList.map(li => {
    // if an operation occurred at all, return details
    if(li.operation) {
      // insert, also handle text field... thi
      if (li.operation.type === 'replace' && li.operation.path.endsWith('.code')) {
        return ({
          operation: `Replace condition code ${li.operation.oldValue} with ${li.code}`,
          conditionName: undefined, // isn't currently being passed through...
          codeSystemVersion: undefined, // same here
          conditionCode: li.code,
          conditionSystem: li.system,
        })
      } else if (li.operation.type === 'replace' && li.operation.path.endsWith('.text')) {
        return ({
          operation: `Replace condition text ${li.operation.oldValue} with ${li.text}`,
          conditionName: undefined, // isn't currently being passed through...
          codeSystemVersion: undefined, // same here
          conditionCode: li.code,
          conditionSystem: li.system,
        })
      }  else if (li.operation.type === 'insert' && li.operation.path.endsWith('.extension')) {
        return ({
          operation: 'Add condition',
          conditionName: li?.operation?.newValue?.text, // is the text field, not name...
          codeSystemVersion: undefined, // same here
          conditionCode: li?.operation?.newValue?.valueCodeableConcept?.coding?.[0]?.code,
          conditionSystem: li?.operation?.newValue?.valueCodeableConcept?.coding?.[0]?.system,
        })
      } else if (li.operation.type === 'delete') {
        const splitIndex = li.operation.path.lastIndexOf('.')
        const itemToDelete = splitIndex ? li?.operation?.path?.slice?.(splitIndex + 1) : null
        return ({
          operation: `Delete field: ${itemToDelete}`,
          conditionName: undefined, // isn't currently being passed through...
          codeSystemVersion: undefined, // same here
          conditionCode: li.code,
          conditionSystem: li.system,
        })
      }
    // if no operation occurred, just return condition info
    } else {
      return ({
        operation: undefined,
        conditionName: undefined, //
        codeSystemVersion: undefined, //
        conditionSystem: li.system,
        conditionCode: li.code
      })
    }
  })
}

// need status in grouperlist for valuesets table
// need title in grouperlist for vs table
// need code system for valueset
// need status for code system (e.g. published?)
// need to always include text on conditions items
const generateGrouperValueSetTable = (grouperPage) => {
  const newData = grouperPage.newData.grouperList.map(gi => ({
    // 'priority': need grouper priority!
    oid: gi.memberOid,
    change: generateMainChangeText(gi),
    conditionUpdates: generateConditionUpdates(gi.conditions)
  }))

  return newData
}

const generateCodeChangesTable = (grouperPage) => {

  const newData = grouperPage.newData.codes.map(ci => ({
    change: ci?.operation?.type,
    oid: ci?.memberOid,
    code: ci?.code,
    descriptor: ci?.display,
    codeSystem: ci?.system,
    codeSystemVersion: ci?.version // undefined for now?

  }))
  console.log('new data: ', newData)
  return newData
}

const generateGrouperPages = (allGrouperPages) => {
  const res = allGrouperPages.map(grp => ({
    metadata: generateGrouperMetadata(grp),
    valueSetsTable: generateGrouperValueSetTable(grp),
    codeSystemsTable: generateCodeChangesTable(grp)
  }))
  console.log('res: ', res)
  return res
}

export const createTableData = (diffData) => {
  const oldRootData = diffData.pages.find(p => p.oldData)
  const newRootData = diffData.pages.find(p => p.newData)

  const allGrouperPages = diffData.pages.filter(p => p.newData.resourceType === 'ValueSet')
  console.log('all groupers: ', allGrouperPages)
  const grouperPageData = generateGrouperPages(allGrouperPages)

  console.log('grouper page data: ', JSON.stringify(grouperPageData))
  return ({
    rootLibrary: generateRootTableData(oldRootData, newRootData),
    grouperPages: grouperPageData
  })
}