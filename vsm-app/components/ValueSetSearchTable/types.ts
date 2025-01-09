import { Condition } from "@/helpers/conditionHelpers"
import { SelectedValueSet, SelectedGrouper } from "@/types/grouperTypes"

export interface SearchReponseParams {
  searchContext: 'filter' | 'search'
  response: Response | undefined
}

export interface QueryStringItems {
  searchType: string
  count: string
  sortBy: string
  sortDirection: string
  offset: string
  terminologyServer: string
}

export type Offset = {
  [key: string]: string | null
}

export interface LeafsToAdd {
  selectedTerminologyServer: 'vsac' | 'ontoserverR4'
  selectedValueSets: SelectedValueSet[]
  selectedConditions: Condition[]
  selectedGroupers: SelectedGrouper[]
  selectedPriority: 'emergent' | 'routine'
}

export type HandleAddVSets = (vsets: LeafsToAdd) => void
export type TableContextType = 'add-grouper' | 'search-page'

export interface ValueSetSearchTableProps {
  handleAddValueSets?: HandleAddVSets
  tableContext: TableContextType
  currentSelectedVSId?: string[]
}

export interface ConditionItem {
  code: string
  display: string
  system: string
  version: string
}

export type TableContextOptions = 'terminology' | 'vsm-provisional'

export interface SubmitProps {
  hide: boolean
}
