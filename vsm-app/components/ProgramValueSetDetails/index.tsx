import React, { SetStateAction, useEffect, useMemo, useState } from 'react'
import Select, { MultiValue } from 'react-select'
import { useSession } from 'next-auth/react'
import DT from 'react-data-table-component'
import { Box, Tooltip } from '@mui/material'
import uniqBy from 'lodash.uniqby'
import { toast } from 'react-toastify'
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal'
import { PageTitle } from '@/components/Typography'
import { FilterInput } from '@/components/FilterInput'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/buttons/Button'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { Result, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { getTerminologySource } from '@/helpers/valueSetHelpers'
import { useDebounce } from '@/hooks/useDebounce'
import { formatConditionsComposeInclude, buildConditionOptions, ConditionToUpdate, Condition } from '@/helpers/conditionHelpers'
import LoadingIndicator from '@/components/LoadingIndicator'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { GroupUpdateItem, TableRow, GroupInfoItem, TerminologyResult } from '@/types/valuesets'
import LinearProgressWithLabel from '@/components/LinearProgressWithLabel'
import { UpdateValueSetsResponse } from 'pages/api/valueset/update'
import { Col, Row, FlexRow } from '@/styles'
import { SelectInputContainer, SelectInputTitle, ReadOnlyContainer, ReadOnlyTag, LoadingMessage, TableActions } from './styles'
import { NextRouter } from 'next/router'
import { customTableStyles } from '../tables/themes'
import InfoIcon from '@mui/icons-material/Info'

import { buildGroupOptions } from '@/helpers/selectHelpers'

const subscribe = async (setJobStatus: React.Dispatch<SetStateAction<number | null>>, jobId: string) => {
  const jobStatus = (await fetch(`/api/valueset/update?jobId=${jobId}`).then((response) => response.json())) as UpdateValueSetsResponse & {
    progress: number
  }
  // progress gets converted from a function to a number after being serialized
  if (!('error' in jobStatus)) {
    setJobStatus(jobStatus.progress)
    if (jobStatus.progress < 100) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await subscribe(setJobStatus, jobId)
    } else {
      toast.success('ValueSet Update finished.')
      setJobStatus(null) // No Job in progress
    }
  } else {
    console.error(jobStatus.error)
  }
}

interface ProgramValueSetDetailsProps {
  programId: string
  router: NextRouter
}

export interface HandleVersionChange {
  useContext: fhir4.UsageContext[]
  selectedVsId: string
  selectedVersion: string
  vsCanonical: string
  grouperIds: string[]
  terminologyInfo: TerminologyResult
}

const DEFAULT_FILTERS = {
  findInOid: '',
  findInVsTitle: '',
  findInSteward: '',
  findInVersion: '',
  activeConditions: [],
  activeGroups: []
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

const ProgramValueSetDetails = ({ programId, router }: ProgramValueSetDetailsProps) => {
  const [versions, setVersions] = useState({} as any)
  // updates that happen via multiselects within table
  const [conditionToUpdate, setConditionToUpdate] = useState<ConditionToUpdate>({
    canonical: '',
    version: ''
  })
  const [updateVsGroups, setUpdateVsGroups] = useState<GroupUpdateItem>({})
  const [versionToUpdate, setVersionToUpdate] = useState<HandleVersionChange>({
    vsCanonical: '',
    useContext: [],
    selectedVsId: '',
    selectedVersion: '',
    grouperIds: [],
    terminologyInfo: { value: '', hasExtension: false }
  })
  const [versionUpdateInFlight, setVersionUpdateInFlight] = useState(false)

  // returned data from PUT operations
  const [updatedGrouperValueSets, setUpdatedGrouperValueSets] = useState<fhir4.ValueSet[]>([])
  const [updatedValueSet, setUpdatedValueSet] = useState<fhir4.ValueSet>()
  const [updatedGrouper, setUpdatedGrouper] = useState(null)

  // loading states
  const [pageLoading, setPageLoading] = useState(true)
  const [grouperLoading, setGrouperLoading] = useState(false)
  const [conditionLoading, setConditionLoading] = useState(false)
  const [vSetsLoading, setVSetsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [jobInProgressStatus, setJobInStatusProgress] = useState<number | null>(null)
  const [loadingVersionsForVs, setLoadingVersionsForVs] = useState<string | null>(null) // when active, id of vs
  // row actions
  const [selectedRows, setSelectedRows] = useState<TableRow[]>([])
  const [toggleUpdateData, setToggleUpdateData] = useState(false)
  const [tableKey, setTableKey] = useState(1)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  // handle error display
  const [error, setError] = useState<null | string>(null)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  // all available filters
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // debounce changes to avoid extra server reqs
  const debouncedFilters = useDebounce(filters, 300)

  const handleBatchDelete = async (itemsToDelete: TableRow[]) => {
    setError(null)
    const payload = formatDeletePayload(itemsToDelete)

    setIsDeleting(true)

    const body = JSON.stringify({ batchDelete: payload })

    const result = await fetch(`/api/programs/${programId}/grouper/valueset`, {
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

  const handleUpdateValueSets = async () => {
    const canonicalUrls: string[] = []
    if (progValueSetDets?.groupsInProgram?.length) {
      for (const grouper of progValueSetDets?.groupsInProgram) {
        const urls = grouper?.compose?.include?.[0]?.valueSet?.filter((url) => !url.includes('|')) || []
        canonicalUrls.push(...urls)
      }
    }

    const job = await fetch(`/api/valueset/update`, {
      method: 'PUT',
      body: JSON.stringify({ urls: canonicalUrls, programId })
    }).then((res) => res.json())

    subscribe(setJobInStatusProgress, job?.id)
  }

  const handleChange = ({ selectedRows }: SelectedRows) => {
    // You can set state or dispatch with something like Redux so we can use the retrieved data
    setSelectedRows(selectedRows)
  }

  useEffect(() => {
    let endpoint = `/api/programs/${programId}/details/valuesets/conditions`
    const postUpdate = async () => {
      if (conditionToUpdate?.conditionInfo) {
        setConditionLoading(true)
        try {
          let json = await fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(conditionToUpdate)
          }).then((res) => res.json())

          setUpdatedValueSet(json)
        } catch (e) {
          // handle error here
          console.error('error: ', e)
        }
        setConditionLoading(false)
      }
    }
    setUpdatedGrouperValueSets([])
    postUpdate()
  }, [conditionToUpdate, programId])

  useEffect(() => {
    const endpoint = `/api/programs/${programId}/details/valuesets/groups`
    const postUpdate = async () => {
      if (updateVsGroups?.groupInfo) {
        setGrouperLoading(true)
        const updatedVs = await fetch(endpoint, {
          method: 'PUT',
          body: JSON.stringify(updateVsGroups)
        }).then((res) => res.json())

        setUpdatedGrouperValueSets(updatedVs)
        setGrouperLoading(false)
      }
    }
    postUpdate()
  }, [updateVsGroups.groupInfo, programId, updateVsGroups])

  const progValueSetDets = useGetProgramValueSetDetails({
    id: programId,
    updatedValueSet, // this gets updated when a user adds a condition
    updatedGrouperValueSets, // this gets updated when a user adds a vs to a grouper
    updatedGrouper,
    toggleUpdateData,
    ...debouncedFilters
  }) as Result

  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({
    id: programId,
    toggleRefresh: toggleUpdateData
  })

  // since query takes a while, expose loading state
  useEffect(() => {
    setVSetsLoading(true)
  }, [filters])

  useEffect(() => {
    setVSetsLoading(false)
  }, [progValueSetDets])

  useEffect(() => {
    setPageLoading(false)
  }, [progValueSetDets])

  const conditions = useGetConditions()
  const allConditions = formatConditionsComposeInclude(conditions)
  const groupsInProgram = progValueSetDets?.groupsInProgram
  const totalLeafs = progValueSetDets?.totalLeafs

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
    // const existingVersion = '' // get existing version from grouper if set
    const asyncOptions = await fetch(`/api/valueset/${vsId}/versions`)
      .then((res) => res.json())
      .then((versions) => [defaultVersion, ...versions].map((item) => ({ value: item, label: item })))

    setVersions({ ...versions, ...{ [vsId]: asyncOptions } })
    setLoadingVersionsForVs(null)
  }

  useEffect(() => {
    if (!versionToUpdate.grouperIds?.length) {
      return
    }

    const body = JSON.stringify(versionToUpdate)
    // you want to update the associated grouper valuesets, adding or removing versions
    async function updateVersions() {
      const result = await fetch(`/api/valueset/versions`, {
        method: 'PUT',
        body
      }).then((res) => res.json())
      if (result) {
        setUpdatedGrouper(result)
      }
      setVersionUpdateInFlight(false)
    }

    try {
      updateVersions()
    } catch (e) {
      setVersionUpdateInFlight(false)
    }
    setVersionToUpdate({ vsCanonical: versionToUpdate.vsCanonical, selectedVersion: versionToUpdate.selectedVersion })
  }, [versionToUpdate])

  // Can only edit if program is loaded and in draft status
  const isEditable = progValueSetDets?.data?.[0]?.programStatus === 'draft' && can(session, 'edit')

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
        selector: (row: TableRow) => row.title,
        sortable: false,
        maxWidth: '350px',
        wrap: true
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
        selector: (row: TableRow) => row?.valueSet?.url?.split?.('/ValueSet/')?.[1],
        sortable: false,
        style: { fontSize: '12px' },
        maxWidth: '360px',
        wrap: true
      },
      {
        name: (
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <SelectInputTitle style={{ marginBottom: '30px', marginRight: '0' }}>Version</SelectInputTitle>
          </div>
        ),
        id: 'vs-version-search',
        selector: (row: TableRow) => row.version,
        sortable: false,
        maxWidth: '160px',
        wrap: true,
        cell: (row: TableRow) => {
          if (progValueSetDets.programStatus === 'active') {
            return row?.valueSetPinnedVersion || 'latest'
          }
          const terminologyInfo = getTerminologySource(row.valueSet)
          const inputValue = 'Retrieving all versions'
          const defaultValue = row?.valueSetPinnedVersion || 'latest'
          const defaultOption = [{ label: defaultValue, value: defaultValue }]

          return (
            <SelectInputContainer onClick={async () => await fetchVersionOptions(row.valueSet.id!)}>
              <Select
                menuPlacement="top"
                instanceId="version-selector"
                isDisabled={versionUpdateInFlight}
                onChange={(e) => {
                  setVersionUpdateInFlight(true)
                  const grouperIds = row?.groups?.map((g) => g.id)
                  setVersionToUpdate({
                    selectedVsId: row?.valueSet?.id as string,
                    selectedVersion: e?.value as string,
                    useContext: row?.valueSet?.useContext || [],
                    vsCanonical: row?.valueSet?.url as string,
                    grouperIds,
                    terminologyInfo
                  })
                }}
                isLoading={loadingVersionsForVs === row?.valueSet?.id}
                loadingMessage={() => <LoadingMessage>{inputValue}</LoadingMessage>}
                isMulti={false}
                options={versions?.[row.valueSet.id!] || [{ label: 'latest', value: 'latest' }]}
                defaultValue={defaultOption}
              />
            </SelectInputContainer>
          )
        }
      },
      {
        name: (
          <div>
            <SelectInputTitle>Steward</SelectInputTitle>
            <FilterInput onChange={(e) => handleFilterChange(e.target.value, 'findInSteward')} style={{ height: '30px' }} />
          </div>
        ),
        selector: (row: TableRow) => row.valueSet.publisher,
        sortable: true,
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
        selector: (row: TableRow) => row.valueSet,
        sortable: true,
        maxWidth: '120px',
        wrap: true,
        cell: (row: TableRow) => {
          const terminologyInfo = getTerminologySource(row.valueSet)
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
              menuPlacement="bottom"
              placeholder="Filter conditions"
              classNamePrefix="conditions"
              inputId="conditions-selector"
              instanceId="conditions-selector"
              isMulti
              options={buildConditionOptions(allConditions)}
              onChange={(e) => {
                handleFilterChange(e, 'activeConditions')
              }}
            />
          </SelectInputContainer>
        ),
        id: 'value-set-conditions',
        selector: (row: TableRow) => row.valueSet,
        sortable: false,
        wrap: true,
        cell: (row: TableRow, index: number) => {
          const selectedOptions = row?.valueSet?.useContext
            ?.map((i) => {
              if (i?.code?.code === 'focus' && i?.code?.system?.endsWith('/usage-context-type')) {
                return {
                  label: i?.valueCodeableConcept?.text,
                  value: {
                    system: i?.valueCodeableConcept?.coding?.[0]?.system,
                    code: i?.valueCodeableConcept?.coding?.[0]?.code,
                    version: i?.valueCodeableConcept?.coding?.[0]?.version,
                    text: i?.valueCodeableConcept?.text
                  }
                }
              }
            })
            .filter((x) => x) as Condition[]
          return row.programStatus === 'active' || !can(session, 'edit') ? (
            <ReadOnlyContainer>
              {selectedOptions?.map((o) => (
                <ReadOnlyTag key={o.label.replaceAll(' ', '')}>{o.label}</ReadOnlyTag>
              ))}
            </ReadOnlyContainer>
          ) : (
            <SelectInputContainer id={`condition-selector-${row.valueSet.id}`}>
              <Select
                menuPlacement={index === 0 ? 'bottom' : 'top'}
                instanceId="condition-selector"
                isMulti={true}
                options={buildConditionOptions(allConditions, selectedOptions)}
                value={selectedOptions}
                isLoading={conditionLoading && row?.canonical === conditionToUpdate?.canonical}
                // TODO should block add if already exists
                onChange={(e) => {
                  const conditionInfo = e as Condition[]
                  conditionInfo &&
                    setConditionToUpdate({
                      canonical: row.canonical,
                      version: row.version,
                      conditionInfo
                    })
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
        selector: (row: TableRow) => row.groups,
        sortable: false,
        allowOverflow: true,
        wrap: true,
        cell: (row: TableRow, index: number) => {
          const selectedOptions = row?.groups?.map((i) => ({ label: i?.title?.replaceAll('_', ' '), value: i?.id }))

          const dedupedSelectedOptions = uniqBy(selectedOptions, 'label')

          return row.programStatus === 'active' || !can(session, 'edit') ? (
            <ReadOnlyContainer>
              {dedupedSelectedOptions.map((o) => (
                <ReadOnlyTag key={o.label.replaceAll(' ', '')}>{o.label}</ReadOnlyTag>
              ))}
            </ReadOnlyContainer>
          ) : (
            <SelectInputContainer>
              <Select
                menuPlacement={index === 0 ? 'bottom' : 'top'}
                isClearable={false}
                classNamePrefix="groups"
                inputId="groups-selector"
                instanceId="groups-selector"
                isMulti={true}
                isLoading={grouperLoading && updateVsGroups?.canonical === row?.canonical}
                options={buildGroupOptions(groupsInProgram)}
                value={dedupedSelectedOptions}
                onChange={(e) => {
                  if (e.length === 0) {
                    toast.error('ValueSets must belong to a group.\nPlease add one before deleting.')
                    return
                  }
                  const groupInfo = e as GroupInfoItem[]
                  setUpdateVsGroups({ canonical: row?.canonical, groupInfo })
                }}
              />
            </SelectInputContainer>
          )
        }
      }
    ],
    [router, groupsInProgram, allConditions]
  )

  const allowToEdit = can(session, 'edit') && progValueSetDets?.programStatus === 'draft'

  const updateVSetsButton = (() => {
    if (typeof jobInProgressStatus === 'number') {
      return <LinearProgressWithLabel value={jobInProgressStatus} sx={{ mr: '15px', mt: '20px', ml: '15px', minWidth: '150px' }} />
    } else if (programAndGrouperData?.program?.status === 'active') {
      return (
        <Button
          text="Code Search"
          style={{ minHeight: '40px', minWidth: '150px' }}
          onClick={() => router.push(`${router.asPath}/codesearch`)}
        />
      )
    } else if (allowToEdit) {
      return (
        <>
          <Tooltip title={'Retrieves and updates all valuesets with version "latest"'} placement="left" arrow>
            <InfoIcon
              sx={{ color: 'var(--theme-400)', width: '20px', position: 'absolute', transform: 'translate(-119%, 314%)', height: '20px' }}
            />
          </Tooltip>
          <Button text="Update Valuesets" style={{ minHeight: '40px', width: '100%' }} onClick={() => handleUpdateValueSets()} />
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
      <DeleteConfirmationModal
        isOpen={showConfirmationModal}
        toggleModalOpen={() => setShowConfirmationModal((show) => !show)}
        handleConfirmDelete={async () => await handleBatchDelete(selectedRows)}
        itemToDelete={`${selectedRows.length} Valueset(s)`}
      />
      <Row>
        <FlexRow style={{ width: '80%' }}>
          <PageTitle style={{ marginBottom: '2rem' }}>Program ValueSet Details</PageTitle>
        </FlexRow>
        <Col style={{ flex: 1, gap: '12px', marginBottom: '12px' }}>
          {isEditable && (
            <Button
              id="add-valueset"
              text="Add Valuesets"
              style={{ minHeight: '40px', minWidth: '150px' }}
              onClick={() => router.push(`${router.asPath}/search`)}
            />
          )}
          {updateVSetsButton}
        </Col>
      </Row>
      <Box id="vs-table-detail">
        <TableActions
          handleDelete={() => setShowConfirmationModal(true)}
          selectedRows={selectedRows}
          totalRows={totalLeafs || 0}
          isDeleting={isDeleting}
          programId={programId}
          handleToggleUpdateData={setToggleUpdateData}
        />
        <ErrorMessage error={error} />
        <DT
          selectableRows={Boolean(programId && isEditable)}
          onSelectedRowsChange={handleChange}
          className="vs-table-detail"
          key={tableKey}
          // @ts-expect-error
          data={progValueSetDets?.data}
          keyField="canonical"
          persistTableHead={true}
          // @ts-expect-error
          columns={columns}
          theme="aphl"
          pagination
          clearSelectedRows={toggleUpdateData}
          highlightOnHover={true}
          onRowClicked={(row) => {
            router.push(`/programs/${programId}/valuesets/${row?.valueSet?.id}`)
          }}
          fixedHeader // TODO: Should we remove? adds an additional scrollbar
          customStyles={customTableStyles('clickable')}
          progressPending={pageLoading || programAndGrouperDataLoading}
          progressComponent={<LoadingIndicator />}
        />
      </Box>
    </>
  )
}

export default ProgramValueSetDetails
