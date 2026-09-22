import {ConditionUpdate} from "@/components/DiffViewer/GrouperValueSetsTable";

export const COLORS = {
  add: '#EBEFE9',
  remove: '#FAE6E5',
  update: '#FDF4DD'
}

/**
 * Which colour a change belongs to.
 *
 * Any change that is neither an addition nor a removal counts as an update, rather than each kind of
 * update being listed. A row with no change at all, shown only via "Show unchanged", stays uncoloured.
 */
const changeCategory = (change: string | undefined, added: string[], removed: string[]) => {
  const normalised = change?.trim().toLowerCase()
  if (!normalised) {
    return 'none'
  }
  if (added.includes(normalised)) {
    return 'add'
  }
  if (removed.includes(normalised)) {
    return 'remove'
  }
  return 'update'
}

/**
 * Conditional row styles for change tables, one entry per colour.
 *
 * @param added the change labels this table uses for an addition, lower case
 * @param removed the change labels this table uses for a removal, lower case
 */
export const formatRowStyles = <T extends { change?: string }>(added: string[], removed: string[]) => [
  {
    when: (row: T) => changeCategory(row?.change, added, removed) === 'add',
    style: { backgroundColor: COLORS.add }
  },
  {
    when: (row: T) => changeCategory(row?.change, added, removed) === 'remove',
    style: { backgroundColor: COLORS.remove }
  },
  {
    when: (row: T) => changeCategory(row?.change, added, removed) === 'update',
    style: { backgroundColor: COLORS.update }
  }
]

/**
 * Styling for condition change within grouping list table entry.
 *
 * @param conditionItem the type of condition change
 */
export const generateConditionColor = (conditionItem: ConditionUpdate) => {
  if (conditionItem?.conditionChange?.startsWith('Add')) {
    return ({
      backgroundColor: COLORS.add
    })
  }
  else if (conditionItem?.conditionChange?.startsWith('Replace')) {
    return ({
      backgroundColor: COLORS.update
    })
  }
  else if (conditionItem?.conditionChange?.startsWith('Remove')) {
    return ({
      backgroundColor: COLORS.remove
    })
  } else {
    return ({})
  }
}