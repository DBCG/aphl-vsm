import React, { SetStateAction, useCallback, useEffect, useMemo, useState } from 'react'
import Select, { MultiValue } from 'react-select'
import { useSession } from 'next-auth/react'
import DT, { TableColumn } from 'react-data-table-component'
import { Box, LinearProgress, Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { uniq, uniqBy, debounce } from 'lodash'
import { toast } from 'react-toastify'
import { PageTitle } from '@/components/Typography'
import { FilterInput } from '@/components/FilterInput'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/buttons/Button'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetEndpointOptionsForUI } from '@/hooks/useGetEndpointOptionsForUI'
import { useGetConditions } from '@/hooks/useGetConditions'
import { getTerminologySource, getVsSteward, isProvisionalVs } from '@/helpers/valueSetHelpers'
import { useDebounce } from '@/hooks/useDebounce'
import { buildConditionOptions, Condition, ConditionItem } from '@/helpers/conditionHelpers'
import LoadingIndicator from '@/components/LoadingIndicator'
import { allowEditing, VSMSession } from '@/helpers/rolesHelper'
import { GroupUpdateItem, TableRow, GroupInfoItem, TerminologyResult } from '@/types/valuesets'
import LinearProgressWithLabel from '@/components/LinearProgressWithLabel'
import { UpdateValueSetsResponse } from 'pages/api/valueset/update'
import { Col, Row, FlexRow } from '@/styles'
import { SelectInputContainer, SelectInputTitle, ReadOnlyContainer, ReadOnlyTag, LoadingMessage } from './styles'
import { TableActions } from './TableActions'
import { NextRouter } from 'next/router'
import { buildGroupOptions } from '@/helpers/selectHelpers'
import { USHealthVSPriority, getVSPriority, getVSConditions } from '@/helpers/libraryHelpers'
import { retrieveGrouperSetsReturn } from '@/pages/api/programs/[id]/details/valuesets/groups'
import { reactSelectOptionStyle } from '../styleOverrides/reactSelect'
import { IconChip } from '../data-display/Chips'
import TextLink from '../TextLink'

const subscribe = async (
  setJobStatus: React.Dispatch<SetStateAction<number | null>>,
  jobId: string,
  setRefreshErrors: any,
  refreshProgramValueSets: any
) => {
  const jobStatus = (await fetch(`/api/valueset/update?jobId=${jobId}`).then((response) => response.json())) as UpdateValueSetsResponse & {
    progress: number
  }
  // progress gets converted from a function to a number after being serialized
  if (!('error' in jobStatus)) {
    setJobStatus(jobStatus.progress)
    if (jobStatus.progress < 100) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await subscribe(setJobStatus, jobId, setRefreshErrors, refreshProgramValueSets)
    } else {
      toast.dismiss()
      if (jobStatus?.returnvalue?.errors.length > 0) {
        setRefreshErrors({ 'ValueSet Update Errors': jobStatus?.returnvalue?.errors })
        setJobStatus(null) // No Job in progress
      } else {
        const totalNumbOfUpdates = jobStatus?.returnvalue?.totalNumbOfUpdates
        const toastMessage = totalNumbOfUpdates > 0 ? `Successfully updated ${totalNumbOfUpdates} ValueSets` : 'No updates needed'
        refreshProgramValueSets()
        toast.success('ValueSet Update Operation Finished. \n' + toastMessage)
        setJobStatus(null) // No Job in progress
      }
    }
  } else {
    console.error(jobStatus.error)
  }
}

interface ProgramValueSetDetailsProps {
  program: fhir4.Library
  router: NextRouter
}

export interface HandleVersionChange {
  programId: string
  useContext: fhir4.UsageContext[]
  selectedVsId: string
  selectedVersion: string
  vsCanonical: string
  grouperIds: string[]
  terminologyInfo: TerminologyResult
}
export interface OptionType {
  label: string
  value: string
  id: string
}

export const priorityLevelOptions = [
  { label: 'Emergent', value: 'emergent', id: 'emergent' },
  { label: 'Routine', value: 'routine', id: 'routine' }
] as const

export type PriorityLevelOption = typeof priorityLevelOptions[number]

const DEFAULT_FILTERS = {
  findInOid: '',
  findInVsTitle: '',
  findInPublisher: '',
  findInVersion: '',
  activeConditions: [],
  activeGroups: [],
  activePriority: []
}

interface SelectedRows {
  selectedRows: TableRow[]
}

type DeletePayload = Record<string, string[]>

const formatDeletePayload = (rows: TableRow[]): DeletePayload => {
  const payload = {} as DeletePayload

  rows.forEach((row) => {
    const vsCanonical = row.valueSet.url!
    const grouperIds = row.groups.map((g) => g.id!)
    if (payload[vsCanonical]) {
      payload[vsCanonical] = payload[vsCanonical].concat(grouperIds)
    } else {
      payload[vsCanonical] = grouperIds
    }
  })
  return payload
}

type LoadingField = {
  fieldName: string;
  id: string
}

const ProgramValueSetDetails = ({ router, program }: ProgramValueSetDetailsProps) => {
  const [refreshErrors, setRefreshErrors] = useState<null | string[]>(null)
  const [versions, setVersions] = useState({} as any)

  const { terminologySources } = useGetEndpointOptionsForUI()

  const [updateVsGroups, setUpdateVsGroups] = useState<GroupUpdateItem>({})
  const [currentProgram, setCurrentProgram] = useState<fhir4.Library>(program)

  const handleCloseErrors = () => setRefreshErrors(null)

  // returned data from PUT operations
  const [updatedGrouperValueSets, setUpdatedGrouperValueSets] = useState<fhir4.ValueSet[]>([])

  // loading states
  const [grouperLoading, setGrouperLoading] = useState(false)
  const [loadingField, setLoadingField] = useState<LoadingField | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [jobInProgressStatus, setJobInStatusProgress] = useState<number | null>(null)
  const [loadingVersionsForVs, setLoadingVersionsForVs] = useState<string | null>(null) // when active, id of vs
  // row actions
  const [selectedRows, setSelectedRows] = useState<TableRow[]>([])

  // select portal target (z-index issues)
  const [myDocument, setMyDocument] = useState<HTMLElement | null>(null)

  // handle error display
  const [error, setError] = useState<null | string>(null)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  // all available filters
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // debounce changes to avoid extra server reqs
  const debouncedFilters = useDebounce(filters, 300)
  const valueSetPriorityMap = getVSPriority(currentProgram)

  const conditionsMap = useMemo(() => getVSConditions(currentProgram), [currentProgram])

  const handleBatchDelete = async (itemsToDelete: TableRow[]) => {
    setError(null)
    const payload = formatDeletePayload(itemsToDelete)
    setIsDeleting(true)
    const body = JSON.stringify({ batchDelete: payload })
    const result = await fetch(`/api/programs/${currentProgram?.id}/grouper/valueset`, {
      method: 'DELETE',
      body: body
    })

    if (result.ok) {
      router.reload()
    } else {
      const json = await result.json()
      setError(json.error)
    }
    setIsDeleting(false)
  }

  useEffect(() => {
    setMyDocument(document.body)
  }, [])

  const handleChange = ({ selectedRows }: SelectedRows) => {
    // You can set state or dispatch with something like Redux so we can use the retrieved data
    setSelectedRows(selectedRows)
  }

  const updateVSConditions = async (conditions: Condition[] = [], vsUrl: string, grouperIds: string[]) => {
    const body = JSON.stringify({ grouperIds, conditions, programId: currentProgram?.id, vsUrl })
    try {
      const updatedLibrary = await fetch(`/api/programs/${currentProgram?.id}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      }).then((res) => res.json())

      const oldConditions = conditionsMap[vsUrl]
      const conditionAction = oldConditions?.length > conditions?.length ? 'removed' : `added ${conditions?.[conditions.length - 1]?.label}`
      toast.success(`Successfully ${conditionAction} condition`)
      setCurrentProgram(updatedLibrary)
    } catch (e) {
      toast.error('Error updating condition')
    } finally {
      setLoadingField(null)
    }
  }

  // Updates Group ValueSets
  useEffect(() => {
    const endpoint = `/api/programs/${currentProgram?.id}/details/valuesets/groups`
    const postUpdate = async () => {
      if (updateVsGroups?.groupInfo) {
        setGrouperLoading(true)
        const updatedVs = (await fetch(endpoint, {
          method: 'PUT',
          body: JSON.stringify(updateVsGroups)
        }).then((res) => res.json())) as retrieveGrouperSetsReturn
        setGrouperLoading(false)
        if ('error' in updatedVs) {
          throw new Error(updatedVs.error)
        } else {
          setUpdatedGrouperValueSets(updatedVs)
        }
      }
      setGrouperLoading(false)
    }
    postUpdate()
  }, [updateVsGroups.groupInfo, currentProgram?.id, updateVsGroups])

  const updateValueSetPriority = async (vs: fhir4.ValueSet, priority: USHealthVSPriority, grouperIds: string[]) => {
    const body = JSON.stringify({ grouperIds, priority, programId: currentProgram?.id, vsUrl: vs.url })
    try {
      const updatedLibrary = await fetch(`/api/programs/${currentProgram?.id}/details`, {
        method: 'PUT',
        body
      }).then((res) => res.json())
      toast.success('Priority updated for ' + vs?.title)
      setCurrentProgram(updatedLibrary)
    } catch (e) {
      toast.error('Error updating priority')
    } finally {
      setLoadingField(null)
    }
  }

  const allConditions = useGetConditions() as ConditionItem[]

  const { programValuesets, isLoading, refreshProgramValueSets } = useGetProgramValueSetDetails({
    id: currentProgram?.id!,
    updatedGrouperValueSets, // this gets updated when a user adds a vs to a grouper
    conditionsMap,
    valueSetPriorityMap,
    ...debouncedFilters
  })

  const groupsInProgram = programValuesets?.groupsInProgram
  const totalLeafs = programValuesets?.totalLeafs

  const alphabetizedGroups =
    groupsInProgram?.sort((firstItem: fhir4.ValueSet, secondItem: fhir4.ValueSet) => {
      if (typeof firstItem.title === 'string' && typeof secondItem.title === 'string') {
        return firstItem.title.toUpperCase().localeCompare(secondItem.title.toUpperCase())
      }
      // if not enough information to order, just keep as they are
      return 0
    }) || []

  const handleFilterChange = (e: string | MultiValue<any> | React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (typeof e === 'string') {
      e = e.trim()
    }
    const updatedFilters = { ...filters, [type]: e }
    setFilters(updatedFilters)
  }

  // fetch options for Version field
  const fetchVersionOptions = async (vsId: string) => {
    // if already cached in component, use that version
    if (versions?.[vsId]) {
      return
    }
    // otherwise, loading states and fetch
    setLoadingVersionsForVs(vsId)
    const defaultVersion = 'latest'
    const asyncOptions = await fetch(`/api/valueset/${vsId}/versions`)
      .then((res) => res.json())
      .then((versions) => {
        const versionToAdd = versions.error ? [] : versions
        return [defaultVersion, ...versionToAdd].map((item) => ({ value: item, label: item }))
      })

    setVersions({ ...versions, ...{ [vsId]: asyncOptions } })
    setLoadingVersionsForVs(null)
  }

  const handleVersionUpdate = async (e: any, row: any) => {
    const grouperIds = row?.groups?.map((g: any) => g.id)
    if (grouperIds?.length === 0) {
      setLoadingField(null)
      return
    }
    const terminologyInfo = getTerminologySource(row.valueSet, terminologySources)

    const body = JSON.stringify({
      selectedVsId: row?.valueSet?.id as string,
      selectedVersion: e?.value as string,
      useContext: row?.valueSet?.useContext || [],
      vsCanonical: row?.valueSet?.url as string,
      programId: currentProgram?.id as string,
      grouperIds,
      terminologyInfo
    })

    await fetch(`/api/valueset/versions`, {
      method: 'PUT',
      body
    })
      .catch((e) => console.error('error: ', e))
      .finally(async () => {
        await refreshProgramValueSets()
        setLoadingField(null)
      })
  }

  // Can only edit if program is loaded and in draft status
  const isEditable = allowEditing({ session, programStatus: currentProgram.status })

  const handleUpdateValueSets = useCallback(
    debounce(async (groupsInProgram: fhir4.ValueSet[] = []) => {
      setJobInStatusProgress(0)
      toast.info(
        <div style={{ paddingLeft: '10px' }}>
          <p>
            Attempting to update all Value Sets with version &lsquo;latest&rsquo; by fetching newest available data from terminology
            servers.
          </p>
          <p>This is a long running operation.</p>
          <p>Please wait for completion.</p>
          <LinearProgress color="secondary" />
        </div>,
        {
          autoClose: 10000
        }
      )
      const canonicalUrls: string[] = []
      if (groupsInProgram?.length) {
        for (const grouper of groupsInProgram) {
          const urls = (grouper?.compose?.include?.map((i) => i?.valueSet?.[0]).filter((i) => i) || []) as string[]
          canonicalUrls.push(...urls)
        }
      }
      const job = await fetch(`/api/valueset/update`, {
        method: 'PUT',
        body: JSON.stringify({ urls: uniq(canonicalUrls), programId: currentProgram?.id })
      }).then((res) => res.json())

      subscribe(setJobInStatusProgress, job?.id, setRefreshErrors, refreshProgramValueSets)
    }, 100),
    []
  )

  const blockChanges = false

  const columns = useMemo(
    () => [
      {
        name: (
          <div>
            <SelectInputTitle>Valueset Title</SelectInputTitle>
            <FilterInput
              onChange={(e) => {
                handleFilterChange(e.target.value, 'findInVsTitle')
              }}
              style={{ height: '30px' }}
            />
          </div>
        ),
        id: 'vs-title-search',
        selector: (row: TableRow) => row.valueSet.title,
        style: { fontSize: '14px' },
        sortable: false,
        maxWidth: '350px',
        wrap: true,
        cell: (row: TableRow) => {
          let href = `/programs/${currentProgram?.id}/valuesets/${row?.valueSet?.id}`
          if (row.valueSetPinnedVersion) {
            href += '?pinnedVersion=true'
          }
          return <TextLink href={href} linkText={row.title} forceReload={false} />
        }
      },
      {
        name: (
          <div>
            <SelectInputTitle>OID</SelectInputTitle>
            <FilterInput
              onChange={(e) => {
                handleFilterChange(e.target.value, 'findInOid')
              }}
              style={{ height: '30px' }}
            />
          </div>
        ),
        id: 'vs-oid-search',
        selector: (row: TableRow) => row?.valueSet?.url?.split?.('/ValueSet/')?.[1] || '',
        sortable: false,
        style: { fontSize: '12px' },
        maxWidth: '225px',
        wrap: true
      },
      {
        name: (
          <SelectInputContainer>
            Priority
            <Select
              menuPlacement="bottom"
              placeholder="Filter Priority"
              classNamePrefix="priority-filter"
              inputId="priority-filter"
              instanceId="priority-filter"
              isMulti
              menuPortalTarget={myDocument}
              options={priorityLevelOptions}
              onChange={(e) =>
                handleFilterChange(
                  e.map((i) => i.value),
                  'activePriority'
                )
              }
            />
          </SelectInputContainer>
        ),
        id: 'value-set-priority',
        sortable: false,
        allowOverflow: true,
        maxWidth: '150px',
        wrap: true,
        cell: (row: TableRow, index: number) => {
          const priorityKey = row?.valueSet?.url ?? ''
          const currentPriority = valueSetPriorityMap[priorityKey] as string
          const currentPriorityValue = currentPriority
            ? priorityLevelOptions.find((i) => i.id === currentPriority)
            : // default to Routine, this option does not actually need to be set and will be inferred by default
              // when running $package operation
              priorityLevelOptions[1]
          return !isEditable ? (
            <ReadOnlyContainer>
              <ReadOnlyTag>{currentPriority || 'Routine'}</ReadOnlyTag>
            </ReadOnlyContainer>
          ) : (
            <SelectInputContainer>
              <Select
                menuPortalTarget={myDocument}
                menuPlacement={index === 0 ? 'bottom' : 'top'}
                isClearable={false}
                classNamePrefix="priority-selector"
                inputId="priority-selector"
                instanceId="priority-selector"
                isLoading={loadingField?.fieldName === 'value-set-priority' && row.keyField === loadingField?.id}
                isDisabled={row.keyField === loadingField?.id}
                options={priorityLevelOptions}
                value={currentPriorityValue}
                onChange={async (e) => {
                  if (!!e?.value) {
                    setLoadingField({
                      id: row.keyField,
                      fieldName: 'value-set-priority'
                  })
                    await updateValueSetPriority(
                      row?.valueSet,
                      e?.value,
                      row.groups.map((g) => g.id)
                    )
                  }
                }}
              />
            </SelectInputContainer>
          )
        }
      },
      {
        name: (
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <SelectInputTitle style={{ marginBottom: '30px', marginRight: '0' }}>Version</SelectInputTitle>
          </div>
        ),
        id: 'vs-version-search',
        sortable: false,
        maxWidth: '160px',
        wrap: true,
        cell: (row: TableRow) => {
          if (!isEditable) {
            return row?.valueSetPinnedVersion || 'latest'
          }
          const inputValue = 'Retrieving all versions'
          const defaultValue = row?.valueSetPinnedVersion || 'latest'
          const defaultOption = [{ label: defaultValue, value: defaultValue }]
          const isProvisional = isProvisionalVs(row.valueSet)

          return (
            <SelectInputContainer onClick={async () => await fetchVersionOptions(row.valueSet.id!)}>
              {isProvisional ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <IconChip experimental={false} indicatorType="provisional" />
                  <span style={{ margin: 0, verticalAlign: 'middle' }}>Provisional</span>
                </div>
              ) : (
                <Select
                  menuPortalTarget={myDocument}
                  menuPlacement="top"
                  instanceId="version-selector"
                  isLoading={loadingVersionsForVs === row?.valueSet?.id || (loadingField?.fieldName === 'vs-version-search' && row.keyField === loadingField?.id)}
                  isDisabled={row.keyField === loadingField?.id}
                  onChange={async (evt) => {
                    setLoadingField({
                      id: row.keyField,
                      fieldName: 'vs-version-search'
                    })
                    await handleVersionUpdate(evt, row)}
                  }
                  loadingMessage={() => <LoadingMessage>{inputValue}</LoadingMessage>}
                  isMulti={false}
                  styles={reactSelectOptionStyle()}
                  options={versions?.[row.valueSet.id!] || [{ label: 'latest', value: 'latest' }]}
                  value={defaultOption}
                />
              )}
            </SelectInputContainer>
          )
        }
      },
      {
        name: (
          <div>
            <SelectInputTitle>Publisher</SelectInputTitle>
            <FilterInput onChange={(e) => handleFilterChange(e.target.value, 'findInPublisher')} style={{ height: '30px' }} />
          </div>
        ),
        selector: (row: TableRow) => row.publisher,
        style: { fontSize: '12px' },
        sortable: true,
        maxWidth: '120px',
        wrap: true
      },
      {
        name: (
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <SelectInputTitle style={{ marginBottom: '30px', marginRight: '0' }}>Steward</SelectInputTitle>
          </div>
        ),
        selector: (row: TableRow) => getVsSteward(row.valueSet),
        style: { fontSize: '12px' },
        sortable: false,
        maxWidth: '120px',
        wrap: true
      },
      {
        name: (
          <div style={{ marginTop: '20px' }}>
            <SelectInputTitle>Source</SelectInputTitle>
            <p style={{ fontSize: '90%', fontStyle: 'italic' }}>* source inferred by url</p>
          </div>
        ),
        sortable: true,
        maxWidth: '100px',
        wrap: true,
        cell: (row: TableRow) => {
          var errors: string[] = []
          const terminologyInfo = getTerminologySource(row.valueSet, terminologySources, errors)
          return (
            <div>
              {terminologyInfo.value}
              {terminologyInfo.hasExtension ? null : '*'}
            </div>
          )
        }
      },
      {
        name: (
          <SelectInputContainer>
            Conditions
            <Select
              menuPortalTarget={myDocument}
              menuPlacement="bottom"
              placeholder="Filter conditions"
              classNamePrefix="conditions-filter"
              inputId="conditions-filter"
              instanceId="conditions-filter"
              isMulti
              options={buildConditionOptions(allConditions)}
              onChange={(e) => {
                handleFilterChange(e, 'activeConditions')
              }}
            />
          </SelectInputContainer>
        ),
        id: 'value-set-conditions',
        sortable: false,
        wrap: true,
        minWidth: '210px',
        cell: (row: TableRow, index: number) => {
          const vsConditions = conditionsMap[row?.valueSet?.url!] || []
          const selectedOptions = vsConditions
            ?.map((i) => {
              const system = i?.valueCodeableConcept?.coding?.[0]?.system
              const code = i?.valueCodeableConcept?.coding?.[0]?.code
              const systemCodeText = system && code ? `Code ${code} in system ${system}` : null
              return {
                label: i?.valueCodeableConcept?.text || systemCodeText || '[missing condition text]',
                groupIds: row.groups.map((i) => i.id) || [],
                value: {
                  system: system || '',
                  code: code || '',
                  version: i?.valueCodeableConcept?.coding?.[0]?.version || '',
                  text: i?.valueCodeableConcept?.text
                }
              }
            })
            .filter((x) => x) as Condition[]
          return !isEditable ? (
            <ReadOnlyContainer>
              {selectedOptions?.map((o) => (
                <ReadOnlyTag key={o.label.replaceAll(' ', '')}>{o.label}</ReadOnlyTag>
              ))}
            </ReadOnlyContainer>
          ) : (
            <SelectInputContainer id={`condition-selector-${row.valueSet.id}`}>
              <Select
                isDisabled={blockChanges || loadingField?.fieldName === 'value-set-conditions'}
                menuPortalTarget={myDocument}
                menuPlacement={index === 0 ? 'bottom' : 'top'}
                instanceId="condition-selector"
                isMulti={true}
                styles={reactSelectOptionStyle({ minWidth: '200px' })}
                options={buildConditionOptions(allConditions, selectedOptions)}
                value={selectedOptions}
                isLoading={loadingField?.fieldName === 'value-set-conditions'}
                // TODO should block add if already exists
                onChange={async (e) => {
                  const conditionInfo = e as Condition[]
                  setLoadingField({
                    id: row?.keyField,
                    fieldName: 'value-set-conditions'
                  })
                  conditionInfo &&
                    (await updateVSConditions(
                      conditionInfo,
                      row.canonical,
                      row.groups.map((i) => i.id)
                    ))
                }}
              />
            </SelectInputContainer>
          )
        }
      },
      {
        name: (
          <SelectInputContainer>
            Groups
            <Select
              menuPortalTarget={myDocument}
              menuPlacement="bottom"
              placeholder="Filter groups"
              classNamePrefix="groups"
              inputId="groups-selector"
              instanceId="groups-selector"
              isMulti
              options={buildGroupOptions(alphabetizedGroups)}
              // @ts-ignore-next-line
              onChange={(e) => {
                handleFilterChange(e, 'activeGroups')
              }}
            />
          </SelectInputContainer>
        ),
        id: 'value-set-groups',
        sortable: false,
        minWidth: '210px',
        allowOverflow: true,
        wrap: true,
        cell: (row: TableRow, index: number) => {
          const selectedOptions = row?.groups?.map((i) => ({ label: i?.title?.replaceAll('_', ' '), value: i?.id }))

          const dedupedSelectedOptions = uniqBy(selectedOptions, 'label')

          return !isEditable ? (
            <ReadOnlyContainer>
              {dedupedSelectedOptions.map((o) => (
                <ReadOnlyTag key={o.label.replaceAll(' ', '')}>{o.label}</ReadOnlyTag>
              ))}
            </ReadOnlyContainer>
          ) : (
            <SelectInputContainer id={`group-selector-${row.valueSet.id}`}>
              <Select
                isDisabled={blockChanges}
                menuPortalTarget={myDocument}
                menuPlacement={index === 0 ? 'bottom' : 'top'}
                isClearable={false}
                classNamePrefix="groups"
                inputId={`groups-selector-input-${row.canonical}`}
                instanceId={`groups-selector-input-${row.canonical}`}
                isMulti={true}
                styles={reactSelectOptionStyle()}
                isLoading={grouperLoading && updateVsGroups?.leafCanonical === row?.canonical}
                options={buildGroupOptions(groupsInProgram)}
                value={dedupedSelectedOptions}
                onChange={(e) => {
                  if (e.length === 0) {
                    toast.error('ValueSets must belong to a group.\nPlease add one before deleting.')
                    return
                  }
                  const groupInfo = e as GroupInfoItem[]
                  setUpdateVsGroups({ leafCanonical: row?.canonical, leafVersion: row?.valueSetPinnedVersion, groupInfo })
                }}
              />
            </SelectInputContainer>
          )
        }
      }
    ],
    [router, groupsInProgram, allConditions, conditionsMap, loadingVersionsForVs, programValuesets?.data, loadingField]
  ) as TableColumn<TableRow>[]

  const updateVSetsButton = (() => {
    if (typeof jobInProgressStatus === 'number') {
      return <LinearProgressWithLabel value={jobInProgressStatus} sx={{ mr: '15px', mt: '20px', ml: '15px', minWidth: '150px' }} />
    } else if (currentProgram?.status === 'active') {
      return (
        <Button
          text="Code Search"
          style={{ minHeight: '40px', minWidth: '150px' }}
          onClick={() => router.push(`${router.asPath}/codesearch`)}
        />
      )
    } else if (isEditable) {
      return (
        <>
          <div>
            <Tooltip title={'Retrieves and updates all valuesets with version "latest"'} placement="left" arrow>
              <InfoIcon
                sx={{ color: 'var(--theme-400)', width: '20px', position: 'absolute', transform: 'translate(-109%, 64%)', height: '20px' }}
              />
            </Tooltip>
            <Button
              text="Update Valuesets"
              style={{ minHeight: '40px', width: '100%' }}
              onClick={() => handleUpdateValueSets(programValuesets?.groupsInProgram)}
            />
          </div>
          <Button
            text="Code Search"
            style={{ minHeight: '40px', minWidth: '150px' }}
            onClick={() => router.push(`${router.asPath}/codesearch`)}
          />
        </>
      )
    }
    return null
  })()

  return (
    <>
      <Col>
        {refreshErrors && <ErrorMessage style={{ marginBottom: '2em' }} error={refreshErrors} handleClose={handleCloseErrors} />}
        <Row>
          <FlexRow style={{ width: '80%' }}>
            <PageTitle style={{ marginBottom: '2rem' }}>Program ValueSet Details</PageTitle>
          </FlexRow>
          <Col style={{ flex: 1, gap: '12px', marginBottom: '12px' }}>
            {isEditable && (
              <>
                <Button
                  id="add-valueset"
                  text="Add Valuesets"
                  style={{ minHeight: '40px', minWidth: '150px' }}
                  onClick={() => router.push(`${router.asPath}/search`)}
                />
              </>
            )}
            {updateVSetsButton}
          </Col>
        </Row>
      </Col>

      <Box id="vs-table-detail">
        <TableActions
          handleDelete={handleBatchDelete}
          formattedConditions={allConditions}
          groupsInProgram={programValuesets?.groupsInProgram!}
          selectedRows={selectedRows}
          totalRows={totalLeafs || 0}
          isDeleting={isDeleting}
          programId={currentProgram?.id!}
          handleToggleUpdateData={() => {
            refreshProgramValueSets()
            setSelectedRows([])
          }}
        />
        <ErrorMessage error={error} />
        <DT
          selectableRows={Boolean(currentProgram?.id && isEditable)}
          onSelectedRowsChange={handleChange}
          className="vs-table-detail"
          keyField={'keyField'}
          data={programValuesets?.data || []}
          persistTableHead={true}
          columns={columns}
          theme="aphl"
          pagination
          fixedHeader // TODO: Should we remove? adds an additional scrollbar
          progressPending={blockChanges}
          progressComponent={<LoadingIndicator />}
        />
      </Box>
    </>
  )
}

export default ProgramValueSetDetails
