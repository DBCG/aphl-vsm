import { get, uniq } from 'lodash'

const rootLibDataPaths = {
  'id': {
    old: [
      'oldData.id.value',
      'newData.id.operation.oldValue'
    ],
    new: [
      'newData.value',
      'oldData.id.operation.newValue'
    ]
  },
  'name': {
    old: [
      'oldData.name.value',
      'newData.name.operation.oldValue'
    ],
    new: [
      'newData.name.value',
      'oldData.name.operation.newValue' 
    ]
  },
  'version': {
    old: [
      'oldData.version.value',
      'newData.version.operation.oldValue'
    ],
    new: [
      'newData.version.value',
      'oldData.version.operation.newValue'
    ]
  },
  'purpose': {
    old: [
      'oldData.purpose.value',
      'newData.purpose.operation.oldValue'
    ],
    new: [
      'newData.purpose.value',
      'oldData.purpose.operation.newValue'
    ]
  },
  'effective start': {
    old: [
      'oldData.effectiveStart.value',
      'newData.effectiveStart.operation.oldValue'
    ],
    new: [
      'newData.effectiveStart.value',
      'oldData.effectiveStart.operation.newValue'
    ]
  },
  'release date': {
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
    'id': ['', ''],
    'name': ['', ''],
    'version': ['', ''],
    'purpose': ['', ''],
    'effective start': ['', ''],
    'release date': ['', '']
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
    'id': 'id.value',
    'title': 'title.value',
    'version': 'version.value',
    'code systems': 'codes'
  }

  const grouperMetadata = () => {
    let result = {}
    const keys = Object.keys(paths)
    keys.forEach(k => {
      if (k === 'code systems') {
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

const generateConditionUpdates = (conditionsList) => {
  return conditionsList.map(li => {
    if(li.operation) {
      // insert, also handle text field
      if (li.operation.type === 'replace' && li.operation.path.endsWith('code')) {
        return ({
          'condition name': '', // isn't currently being passed through...
          'code system version': '', // same here
          'condition code': '',
          'condition system': '',
        })
      }
    } else {
      return ({
        'condition system': li.system,
        'condition code': li.code,
        'condition name': '', //
        'code system version': '' //
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
  const fieldsToGenerate = [
    'change', 'title', 'oid', 'code system', 'code system oid',
    'code system status', 'condition name'
  ]

  const newData = grouperPage.newData.grouperList.map(gi => ({
    'oid': gi.memberOid,
    'change': generateMainChangeText(gi),
    'conditionUpdates': []
  }))
  console.log('new data: ', newData)
  return newData
}

const generateGrouperPages = (allGrouperPages) => {
  const res = allGrouperPages.map(grp => ({
    metadata: generateGrouperMetadata(grp),
    valueSetsTable: generateGrouperValueSetTable(grp)
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

  console.log('grouper page data: ', grouperPageData)
  return ({
    rootLibrary: generateRootTableData(oldRootData, newRootData),
    grouperPages: grouperPageData
  })
}