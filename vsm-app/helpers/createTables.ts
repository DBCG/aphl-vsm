import { DiffData, FlatCodeNew, FlatCodeOld, GrouperPage, GrouperVsPage, LibraryPage } from '@/components/DiffViewer/DiffViewerTypes'
import { get, uniq, uniqWith } from 'lodash'
import { formatDateForTable } from './formatDates'

const rootLibDataPaths: Record<string, { old: string[], new: string[] }> = {
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
  }
}

const getValue = (path: string, oldData: LibraryPage, newData: LibraryPage) => {
  if (path.startsWith('oldData')) {
    const p = path.split('oldData.')[1]
    return get(oldData.oldData, p)
  } else if (path.startsWith('newData')) {
    const p = path.split('newData.')[1]
    return get(newData.newData, p)
  }
}

interface IObjectKeys {
  [key: string]: any
}

interface Result extends IObjectKeys {
  id: [string, string];
  name: [string, string];
  version: [string, string];
  purpose: [string, string];
  effectiveStart: [string, string];
}

const generateRootTableData = (oldData: LibraryPage, newData: LibraryPage) => {
  const result: Result = {
    id: ['', ''],
    name: ['', ''],
    version: ['', ''],
    purpose: ['', ''],
    effectiveStart: ['', ''],
  }

  const colTitles = Object.keys(rootLibDataPaths)
  colTitles.forEach((title) => {
    let oldVal = rootLibDataPaths[title].old
      .map(path => getValue(path, oldData, newData))
      .filter(x => x)[0] || ''

    let newVal = rootLibDataPaths[title].new
      .map(path => getValue(path, oldData, newData))
      .filter(x => x)[0] || ''
      
    if (title === 'effectiveStart') {
      oldVal = oldVal ? formatDateForTable(oldVal, 'm/d/yyyy') : ''
      newVal = newVal ? formatDateForTable(newVal, 'm/d/yyyy') : ''
    }

    result[title] = [oldVal, newVal]
  })
  return result
}

// grouper metadata only cares about the newest info
// RCKMS says they don't really care to compare grouper old/new metadata values
const generateGrouperMetadata = (grouperPage: GrouperVsPage, hasChanges: boolean) => {
  const newData = grouperPage.newData
  const oldData = grouperPage.oldData

  const paths = {
    id: 'id.value',
    title: 'title.value',
    version: 'version.value',
    codeSystems: 'codes'
  } as const

  const grouperMetadata = () => {
    const keys = Object.keys(paths)
    const isDeletedGrouper = Boolean(!newData && oldData)
    const isNewGrouper = Boolean(newData && !oldData)
    const result = {
      isDeleted: isDeletedGrouper,
      isNew: isNewGrouper,
      hasChanges: hasChanges,
      codeSystems: [] as string[]
    }

    keys.forEach(k => {
      if (k === 'codeSystems') {
        // deleted groupers only have oldData
        const codesToCheck = (isDeletedGrouper ? oldData?.codes : newData?.codes) as (FlatCodeOld | FlatCodeNew)[]
        const uniqueSystems = Array.from(new Set(codesToCheck
          ?.filter((c: any) => c?.operation?.type !== 'delete')
          ?.map(i => i.system) ?? []))
        result[k] = uniqueSystems as string[]
      } else {
        // @ts-ignore
        result[k] = get(isDeletedGrouper ? oldData : newData, paths[k])
      }
    })
    return result
  }
  return grouperMetadata()
}

const generateMainChangeText = (grouperListItem: any) => {
  const allConditionChangeTypes = uniq(grouperListItem?.conditions
    ?.filter((c: { operation: any }) => c?.operation)
    ?.map((i: { operation: { type: any } }) => i?.operation?.type)) || [] as string[]

  // A repin is deliberately not reported. The branches below still run for such
  // a leaf, so a condition or priority change it carries is kept.
  if (grouperListItem?.operation?.type === 'insert') {
    return 'Added VS'
  } else if (grouperListItem?.operation?.type === 'delete') {
    return 'Removed VS'
  } else if (allConditionChangeTypes.length === 1) {
    return `${allConditionChangeTypes[0]} Conditions`
  } else if (allConditionChangeTypes.length > 1) {
    // e.g. one condition added and another removed. Without this the row reported no change at all
    // and the table's own filter hid it.
    return 'Updated Conditions'
  } else if (grouperListItem?.priority?.operation) {
    return 'Updated Priority'
  } else {
    return '' // ?
  }
}

// conditions can be added, or removed
// The words the change text starts with drive the row colour - see generateConditionColor.
const CONDITION_CHANGE_TEXT: Record<string, string> = {
  insert: 'Add condition',
  delete: 'Remove condition',
}

// How a code change reads
const CODE_CHANGE_TEXT: Record<string, string> = {
  insert: 'Added',
  delete: 'Removed',
  inactive: 'Inactive',
  'updated code description': 'Updated Code Description'
}

// How a whole leaf value set joining or leaving a grouper reads
const LEAF_CHANGE_TEXT: Record<string, string> = {
  insert: 'Added',
  delete: 'Removed'
}

/**
 * A change operation type in readable format rather than the raw operation type.
 *
 * Falls back to the raw type, so a type gaining no wording yet is still reported rather than
 * silently ignored.
 */
const changeText = (type: string | undefined, words: Record<string, string>) =>
  type ? words[type] ?? type : undefined

/**
 * One renderable row per condition.
 *
 * @param hideConditionChangeText for a value set removed outright, where its own "Removed VS" already
 *   says it and repeating the news per condition adds nothing
 */
const generateConditionUpdates = (conditionsList: any[], hideConditionChangeText: boolean) => {
  if (!conditionsList) return []
  return conditionsList.map(li => ({
    conditionChange: hideConditionChangeText ? '' : CONDITION_CHANGE_TEXT[li?.operation?.type],
    conditionName: li?.display,
    conditionCodeSystemVersion: li?.version,
    conditionCode: li?.codeValue,
    conditionSystem: li?.system
  }))
}

const uniqueCodeSystems = (csArray: { name: string, oid: string }[]): { name: string, oid: string }[] => (uniqWith(
  csArray,
  (cs1, cs2) =>
    cs1.name === cs2.name &&
    cs1.oid === cs2.oid
))

// need status in grouperlist for valuesets table
// need title in grouperlist for vs table
// need code system for valueset
// need status for code system (e.g. published?)
type ValueSetRow = {
  change: string
  codeSystems: { name: string, oid: string }[]
  name: any
  oid: any
  priority: any
  conditionUpdates: ReturnType<typeof generateConditionUpdates>
}

/**
 * Every condition worth showing for a surviving leaf, from both sides.
 *
 * A condition is marked on the side that states it, so one the new release dropped exists only in
 * oldData.
 */
const conditionsFromBothSides = (newLeaf: any, oldLeaf: any) => {
  const kept = newLeaf?.conditions ?? []
  const codingOf = (condition: any) => `${condition?.system ?? ''}|${condition?.codeValue ?? ''}`
  const keptCodings = new Set(kept.map(codingOf))
  const removed = (oldLeaf?.conditions ?? []).filter((c: any) => c?.operation && !keptCodings.has(codingOf(c)))
  return [...kept, ...removed]
}

// need to always include text on conditions items
const generateGrouperValueSetTable = (grouperPage: GrouperVsPage) => {
  // doing this here because it's not explicitly noted in the changelog
  const allOldLeafIds = grouperPage?.oldData?.leafValueSets?.map(oldLeaf => oldLeaf?.memberOid) || []
  const newLeafIds = grouperPage?.newData?.leafValueSets?.map(newLeaf => newLeaf?.memberOid) || []

  const deletedLeafIds = allOldLeafIds.filter(id => !newLeafIds.includes(id))
  const deletedValueSets = grouperPage?.oldData?.leafValueSets?.filter(vs => deletedLeafIds?.includes(vs?.memberOid)) || []
  const oldLeafByOid = new Map((grouperPage?.oldData?.leafValueSets ?? []).map(leaf => [leaf?.memberOid, leaf]))

  let newData: ValueSetRow[] = grouperPage?.newData?.leafValueSets?.map(gi => {
    const newCodeSystems = uniqueCodeSystems(gi?.codeSystems || [])
    const conditions = conditionsFromBothSides(gi, oldLeafByOid.get(gi?.memberOid))
    return ({
      change: generateMainChangeText({ ...gi, conditions }),
      codeSystems: newCodeSystems,
      // The title is more readable. Fall back to name when a leaf has no title.
      name: gi.title || gi.name,
      oid: gi.memberOid,
      priority: gi.priority.value,
      conditionUpdates: generateConditionUpdates(conditions, false)
    })
  }) || []

  // if any deleted valuesets, add them to the set
  // deleted valuesets are currently not part of the operations array
  if (deletedValueSets?.length > 0) {
    const removedItems = deletedValueSets.map((vsItem: any) => {
      const oldCodeSystems = uniqueCodeSystems(vsItem?.codeSystems || [])
      return ({
        change: 'Removed VS',
        codeSystems: oldCodeSystems,
        name: vsItem.title || vsItem.name,
        oid: vsItem.memberOid,
        priority: vsItem.priority.value,
        conditionUpdates: generateConditionUpdates(vsItem.conditions, true)
      })
    })
    newData = [...newData, ...removedItems]
  }
  return newData
}

interface FormatCodeItems {
  codeItems: any
  defaultChange?: string
}

const formatCodeData = ({ codeItems, defaultChange }: FormatCodeItems) => {
  return codeItems.map((ci: FlatCodeOld | FlatCodeNew) => ({
    change: defaultChange || ci?.operation?.type || '',
    oid: ci?.memberOid || '',
    code: ci?.codeValue || '',
    descriptor: ci?.display || '',
    codeSystem: ci?.system || '',
    codeSystemVersion: ci?.version || '',
    codeSystemOID: ci?.codeSystemOid || ''
  }))
}

const generateCodeChangesTable = (grouperPage: GrouperVsPage) => {
  // create-changelog marks a deleted code on the old side, keyed by member value set, system and code.
  // This used to derive deletions here by matching the two sides on codeValue + system + version, which
  // ignored the member value set - so a code dropped from one referenced value set was suppressed
  // whenever another value set in the grouper still carried it.
  const deletedCodes = (grouperPage?.oldData?.codes || []).filter((code) => code?.operation?.type === 'delete')

  return [
    ...formatCodeData({ codeItems: grouperPage?.newData?.codes || [] }),
    ...formatCodeData({ codeItems: deletedCodes})
  ]
}

const generateGrouperPages = (allGrouperPages: GrouperVsPage[]) => {
  const res = allGrouperPages.map((grp, index: number) => {
    const codeChanges = generateCodeChangesTable(grp)
    const valueSetChanges = generateGrouperValueSetTable(grp)
  
    const hasChanges = Boolean(codeChanges?.find((c: { change: string }) => c.change !== '') || valueSetChanges?.find(v => v.change !== ''))
    return (
      {
        metadata: generateGrouperMetadata(grp, hasChanges),
        valueSetsTable: valueSetChanges,
        codeSystemsTable: codeChanges,
        groupIndex: index,
        isDeleted: Boolean(grp?.oldData && !grp.newData),
        isNew: Boolean(!grp?.oldData && grp.newData),
        hasChanges
      }
    )
  })

  return res
}

const generateId = (ind: number, group: any, isDeleted: boolean, isNew: boolean) => {

  const changeText = () => {
    if (isDeleted) return 'deleted'
    if (isNew) return 'added'
    if (group?.valueSetsTable?.find((i: { change: string }) => i.change && i?.change !== '')) {
      return 'updated'
    } else {
      return null
    }
  }

  return ({
    grouperId: `grouper-${ind}`,
    vsTableId: `vs-table-${ind}`,
    codesTableId: `codes-table-${ind}`,
    hasChange: changeText()
  })
}

const generateAnchorLinkData = (grouperPageData: GrouperPage[]) => {
  const base = [{
    rootLibId: `program-metadata`,
    // eventually have PlanDefinition here, too
  }]
  const groupers = grouperPageData.map(
    (group, ind) => {
      return (generateId(ind, group, group.isDeleted, group.isNew))
    }
  )
  return [...base, ...groupers]
}

const createTableData = (diffData: DiffData) => {
  if (!diffData) {
    return null
  }

  const oldRootData = diffData.pages.find(p => p.oldData)
  const newRootData = diffData.pages.find(p => p.newData)

  const allGrouperPages = diffData.pages.filter(p => p?.newData?.resourceType === 'ValueSet' || p?.oldData?.resourceType === 'ValueSet')
  // @ts-ignore
  const grouperPageData = generateGrouperPages(allGrouperPages as GrouperVsPage[])

  return ({
    rootLibrary: generateRootTableData(oldRootData as LibraryPage, newRootData as LibraryPage),
    grouperPages: grouperPageData,
    // @ts-ignore
    anchorLinkData: generateAnchorLinkData(grouperPageData)
  })
}

export { createTableData, CONDITION_CHANGE_TEXT, CODE_CHANGE_TEXT, LEAF_CHANGE_TEXT, changeText }