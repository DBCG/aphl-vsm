interface AnchorLinkGrouperItem {
  grouperId: string
  vsTableId: string
  codesTableId: string
  hasChange: null | string
}

interface AnchorLinkRootItem {
  rootLibId: string
}

interface RootLibrary {
  codeSystems: null
  effectiveStart: (string | undefined)[]
  id: (string)[]
  name: (string | undefined)[]
  purpose: (string | undefined)[]
  releaseDate: (string | undefined)[]
  version: (string | undefined)[]
}

interface CodeSystemTableItem {
  change: string
  code: string
  codeSystem: string
  codeSystemOID: string
  codeSystemVersion: string
  descriptor: string
  oid: string
}

interface GrouperMetadata {
  codeSystems: string[]
  hasChanges: boolean
  id: string
  isDeleted: boolean
  isNew: boolean
  title: string
  version: string
}

interface SimpleCodeSystem {
  name: string
  oid: string
}

interface ConditionUpdates {
  conditionChange: string | undefined
  conditionCode: string
  conditionCodeSystem: string
  conditionCodeSystemVersion: string | undefined
  conditionName: string | undefined
}

interface ValueSetsTableItem {
  change: string
  codeSystems: SimpleCodeSystem[]
  conditionUpdates: ConditionUpdates[]
  name: string
  oid: string
  priority: string
}

interface GrouperPage {
  groupIndex: number
  hasChanges: boolean
  isDeleted: boolean
  isNew: boolean
  codeSystemsTable: CodeSystemTableItem[]
  metadata: GrouperMetadata
  valueSetsTable: ValueSetsTableItem[]
}

interface ChangelogData {
  rootLibrary: RootLibrary
  grouperPages: GrouperPage[]
  anchorLinkData: (AnchorLinkGrouperItem | AnchorLinkRootItem)[]
}

interface ActiveFilters {
  value: string
  label: string 
  key: string 
  filterContext: string 
}

interface ValueSetFilterItem {
  key: string
  label: string
  value: string
}

interface ItemToRemoveVsFilter {
  action: string
  name: string | undefined
  removedValue: {
    label: string
    value: string
    key: string
    filterContext: string
  }
}

interface OldChangeOperation {
  type: string
  path: string
  newValue: string 
}

interface NewChangeOperation {
  type: string
  path: string
  oldValue: string 
}

interface ConditionI {
  value: {
    url: string
    valueCodeableConcept: {
      coding: {
        system: string
        code: string
      }[]
      text: string
    }
  }
}

interface LibRelatedArtifactItems {
  conditions: ConditionI[]
  fullRelatedArtifact: fhir4.RelatedArtifact
  operation?: {
    oldValue: string
    path: string
    type: string
  }
  priority: {
    value: {
      url: string
      valueCodeableConcept: {
        coding: { system: string, code: string }[]
        text: string
      }
    }
  }
  value: string
}

interface LibraryPage {
  resourcetype: 'Library'
  oldData?: {
    resourceType: 'Library'
    effectiveStart: {
      value: string
      operation?: OldChangeOperation
    } | {}
    name: {
      value: string
      operation?: OldChangeOperation
    }
    purpose: {}
    releaseDate: {
      value: string
      operation?: OldChangeOperation
    }
    title: {
      value: string | undefined
      operation?: OldChangeOperation
    }
    url: {
      value: string
      operation?: OldChangeOperation
    }
    version: {
      value: string | undefined
      operation?: OldChangeOperation
    }
    relatedArtifacts: LibRelatedArtifactItems[]
  }
  newData?: {
    resourceType: 'Library'
    effectiveStart: {
      value: string
      operation?: {
        oldValue: { start: string }
      } | {}
    }
    name: {
      value: string
      operation?: NewChangeOperation
    }
    purpose: {}
    releaseDate: {
      value: string
      operation?: NewChangeOperation
    }
    title: {
      value: string | undefined
      operation?: NewChangeOperation
    }
    url: {
      value: string
      operation?: NewChangeOperation
    }
    version: {
      value: string | undefined
      operation?: NewChangeOperation
    }
  }
  resourceType: 'Library'
  url: string
}

interface FlatCondition {
  code: string
  codeSystemName: string
  codeSystemOid: string
  display: string
  system: string
}

interface FlatCodeOld {
  code: string
  codeSystemName: string
  codeSystemOid: string
  display: string
  system: string
  version: string
  parentValueSetUrl: string
  parentValueSetTitle: string
  parentValueSetName: string
  memberOid: string
  operation?: {
    newValue: string
    path: string
    type: string
  }
}

interface FlatCodeNew {
  code: string
  codeSystemName: string
  codeSystemOid: string
  display: string
  system: string
  version: string
  parentValueSetUrl: string
  parentValueSetTitle: string
  parentValueSetName: string
  memberOid: string
  operation?: {
    oldValue: string
    path: string
    type: string
  }
}

interface CodeSystemItem {
  name: string
  oid: string
}

interface LeafVsItemOld {
  url: string
  title: string
  status: string
  name: string
  memberOid: string
  priority: {
    value: string
    operation?: OldChangeOperation
  }
  conditions: FlatCondition[]
  codeSystems: CodeSystemItem[]
}

interface LeafVsItemNew {
  url: string
  title: string
  status: string
  name: string
  memberOid: string
  priority: {
    value: string
    operation?: NewChangeOperation
  }
  conditions: FlatCondition[]
  codeSystems: CodeSystemItem[]
}

interface GrouperVsPage {
  resourceType: 'ValueSet'
  url: string
  oldData?: {
    resourceType: 'ValueSet'
    version: {
      value: string | undefined
      operation?: OldChangeOperation
    }
    id: {
      value: string
      operation?: OldChangeOperation
    }
    name: {
      value: string | undefined
      operation?: OldChangeOperation
    }
    title: {
      value: string | undefined
      operation?: OldChangeOperation
    }
    url: {
      value: string | undefined
      operation?: OldChangeOperation
    }
    leafValuesets: LeafVsItemOld[]
    codes: FlatCodeOld[]
  }
  newData?: {
    resourceType: 'ValueSet'
    version: {
      value: string | undefined
      operation?: NewChangeOperation
    }
    id: {
      value: string
      operation?: NewChangeOperation
    }
    name: {
      value: string | undefined
      operation?: NewChangeOperation
    }
    title: {
      value: string | undefined
      operation?: NewChangeOperation
    }
    url: {
      value: string | undefined
      operation?: NewChangeOperation
    }
    leafValuesets: LeafVsItemNew[] 
    codes: FlatCodeNew[]
  }
}


// also plandefinition but leaving that out since we are not using it now
interface DiffData {
  manifestUrl: string
  pages: (LibraryPage | GrouperVsPage)[]
}


export type {
  AnchorLinkGrouperItem, AnchorLinkRootItem, RootLibrary,
  CodeSystemTableItem, GrouperMetadata, SimpleCodeSystem, ConditionUpdates,
  ValueSetsTableItem, GrouperPage, ChangelogData, ActiveFilters, ValueSetFilterItem,
  ItemToRemoveVsFilter, DiffData, LibraryPage, GrouperVsPage, FlatCodeOld, FlatCodeNew
}