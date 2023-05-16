import React, { SetStateAction, useEffect, useMemo, useState } from 'react'
import Select, { MultiValue } from 'react-select'
import { useSession } from 'next-auth/react'
import DT from 'react-data-table-component'
import uniqBy from 'lodash.uniqby'
import { toast } from 'react-toastify'
import { PageTitle } from '@/components/Typography'
import { FilterInput } from '@/components/FilterInput'
import { IconButton } from '@/components/buttons/IconButton'
import { Button } from '@/components/buttons/Button'
import { Result, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { getTerminologySource } from '@/helpers/valueSetHelpers'
import { useDebounce } from '@/hooks/useDebounce'
import { formatConditionsComposeInclude, buildConditionOptions, ConditionToUpdate, Condition } from '@/helpers/conditionHelpers'
import LoadingIndicator from '@/components/LoadingIndicator'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { GroupUpdateItem, DeleteParams, TableRow, GroupInfoItem, TerminologyResult } from '@/types/valuesets'
import LinearProgressWithLabel from '@/components/LinearProgressWithLabel'
import { UpdateValueSetsResponse } from 'pages/api/valueset/update'
import { Col, Row, FlexRow } from '@/styles'
import { SelectInputContainer, SelectInputTitle, FlexCol, ReadOnlyContainer, ReadOnlyTag, LoadingMessage, customStyles } from './styles'
import { NextRouter } from 'next/router'

const buildGroupOptions = (groupVsets: fhir4.ValueSet[]) => {
  return groupVsets?.map((g) => ({
    value: g.id,
    label: g.title?.replaceAll('_', ' '),
    id: g.id
  }))
}

const subscribe = async (setJobStatus: React.Dispatch<SetStateAction<number | null>>, jobId: string) => {
  const jobStatus = (await fetch(`/api/valueset/update?jobId=${jobId}`).then((response) => response.json())) as UpdateValueSetsResponse & {
    progress: number
  }
  // progress gets converted from a function to a number after being serialized
  if (!('error' in jobStatus)) {
    setJobStatus(jobStatus.progress)
    if (jobStatus.progress < 100) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
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

const DEFAULT_FILTERS = {
  findInOid: '',
  findInVsName: '',
  findInSteward: '',
  findInVersion: '',
  activeConditions: [],
  activeGroups: []
}

const ProgramValueSetDetails = ({ programId, router }: ProgramValueSetDetailsProps) => {
  const [versions, setVersions] = useState({} as any)
  // updates that happen via multiselects within table
  const [conditionToUpdate, setConditionToUpdate] = useState({} as ConditionToUpdate)
  const [updateVsGroups, setUpdateVsGroups] = useState({} as GroupUpdateItem)
  const [versionToUpdate, setVersionToUpdate] = useState({} as any)
  const [versionUpdated, setVersionUpdated] = useState([])

  // returned data from PUT operations
  const [updatedGrouperValueSets, setUpdatedGrouperValueSets] = useState([])
  const [updatedValueSet, setUpdatedValueSet] = useState<fhir4.ValueSet>()
  const [updatedGrouper, setUpdatedGrouper] = useState(null)

  // loading states
  const [pageLoading, setPageLoading] = useState(true)
  const [grouperLoading, setGrouperLoading] = useState(false)
  const [conditionLoading, setConditionLoading] = useState(false)
  const [vSetsLoading, setVSetsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<boolean | string>(false)
  const [jobInProgressStatus, setJobInStatusProgress] = useState<number | null>(null)
  const [loadingVersionsForVs, setLoadingVersionsForVs] = useState<string | null>(null) // when active, id of vs

  const { data: session } = useSession() as unknown as { data: VSMSession }

  // all available filters
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // debounce changes to avoid extra server reqs
  const debouncedFilters = useDebounce(filters, 300)

  const handleDelete = async ({ vsCanonical, grouperCanonicals }: DeleteParams) => {
    if (!vsCanonical || !grouperCanonicals) {
      setIsDeleting(false)
      return
    } else {
      setIsDeleting(vsCanonical)
    }

    try {
      const body = {
        vsCanonical,
        grouperCanonicals
      }

      const result = fetch(`/api/programs/${programId}/grouper/valueset`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }).then((res) => res.json())

      const json = await result

      if (!json) {
        console.error('failure result: ', json)
      } else {
        setIsDeleting(false)
        window.location.reload()
      }
    } catch (e) {
      console.error(e)
    }
    setIsDeleting(false)
  }

  const handleUpdateValueSets = async () => {
    const canonicalUrls: string[] =
      progValueSetDets?.data?.map((data) => {
        return data.canonical
      }) || []
    const job = await fetch(`/api/valueset/update`, {
      method: 'PUT',
      body: JSON.stringify({ urls: canonicalUrls })
    }).then((res) => res.json())

    subscribe(setJobInStatusProgress, job?.id)
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
    versionUpdated,
    ...debouncedFilters
  }) as Result

  // since query takes a while, expose loading state
  useEffect(() => {
    setVSetsLoading(true)
  }, [filters])

  useEffect(() => {
    setVSetsLoading(false)
  }, [progValueSetDets])

  useEffect(() => {
    const keys = Object.keys(progValueSetDets)
    if (keys.length) {
      setPageLoading(false)
    }
  }, [progValueSetDets])

  const conditions = useGetConditions()
  const allConditions = formatConditionsComposeInclude(conditions)
  let groupsInProgram = progValueSetDets?.groupsInProgram

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

  // versionInput
  const handleVersionChange = (
    selectedVersion: string = '',
    vsCanonical: string,
    grouperIds: string[],
    terminologyInfo: TerminologyResult
  ) => {
    const data = { vsCanonical, version: selectedVersion, grouperIds, terminologyInfo }

    // update the grouper canonical version
    setVersionToUpdate(data)
  }

  useEffect(() => {
    if (!versionToUpdate.grouperIds) {
      return
    }
    let result

    const body = JSON.stringify({
      vsCanonical: versionToUpdate.vsCanonical,
      vsVersion: versionToUpdate.version,
      grouperIds: versionToUpdate.grouperIds,
      terminologyInfo: versionToUpdate.terminologyInfo
    })
    // you want to update the associated grouper valuesets, adding or removing versions
    async function updateVersions() {
      result = await fetch(`/api/valueset/versions`, {
        method: 'PUT',
        body
      }).then((res) => res.json())
      if (result) {
        setUpdatedGrouper(result)
      }
    }

    try {
      updateVersions()
    } catch (e) {
      console.error('error: ', e)
    }
    setVersionToUpdate([versionToUpdate.vsCanonical, versionToUpdate.version])
  }, [versionToUpdate])

  // @ts-ignore-next-line
  const isReadOnly = progValueSetDets?.data?.[0]?.programStatus === 'active' || !can(session, 'edit')

  const columns = useMemo(
    () => [
      {
        name: (
          <div>
            <SelectInputTitle>Valueset Name</SelectInputTitle>
            <FilterInput
              onChange={(e) => {
                // @ts-ignore-next-line
                handleFilterChange(e.target.value, 'findInVsName')
              }}
              style={{ height: '30px' }}
            />
          </div>
        ),
        id: 'vs-name-search',
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
                // @ts-ignore-next-line
                handleFilterChange(e.target.value, 'findInOid')
              }}
              style={{ height: '30px' }}
            />
          </div>
        ),
        id: 'vs-oid-search',
        selector: (row: TableRow) => row?.valueSet?.url?.split?.('/ValueSet/')?.[1],
        sortable: false,
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
                instanceId="version-selector"
                onChange={(e) => {
                  const grouperIds = row?.groups?.map((g) => g.id)
                  handleVersionChange(e?.value, row?.valueSet?.url as string, grouperIds, terminologyInfo)
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
            <FilterInput
              onChange={(e) => handleFilterChange(e.target.value, 'findInSteward')}
              style={{ height: '30px' }}
            />
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
        cell: (row: TableRow) => {
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
            <SelectInputContainer>
              <Select
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
        cell: (row: TableRow) => {
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
                isClearable={false}
                classNamePrefix="groups"
                inputId="groups-selector"
                instanceId="groups-selector"
                isMulti={true}
                isLoading={grouperLoading && updateVsGroups?.canonical === row?.canonical}
                // @ts-expect-error
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
      },
      {
        name: (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <p>Remove ValueSet</p>
          </div>
        ),
        omit: isReadOnly,
        selector: (row: TableRow) => row,
        sortable: false,
        wrap: true,
        maxWidth: '150px',
        cell: (row: TableRow) => (
          <FlexRow style={{ justifyContent: 'center' }}>
            <FlexCol>
              <IconButton
                deletedItemDescription={`valueset "${row.title}" from Program ${programId}`}
                onClick={async () => {
                  await handleDelete({
                    vsCanonical: row?.valueSet?.url,
                    grouperCanonicals: row.groups.map((g) => g.url)
                  })
                  window.location.reload()
                }}
                buttonContext="delete"
                style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
              />
              {isDeleting === row?.valueSet?.url && (
                <p>
                  <em>Deleting...</em>
                </p>
              )}
            </FlexCol>
          </FlexRow>
        )
      }
    ],
    [router, groupsInProgram, allConditions]
  )

  const allowToEdit = can(session, 'edit') && progValueSetDets?.programStatus === 'draft'

  const updateVSetsButton = (() => {
    if (typeof jobInProgressStatus === 'number') {
      return <LinearProgressWithLabel value={jobInProgressStatus} sx={{ mr: '15px', mt: '20px', ml: '15px', minWidth: '150px' }} />
    } else if (allowToEdit) {
      return <Button text="Update Valuesets" style={{ minHeight: '40px', minWidth: '150px' }} onClick={() => handleUpdateValueSets()} />
    }
    return null
  })()

  return (
    <>
      <Row>
        <FlexRow style={{ width: '80%' }}>
          <PageTitle>Program ValueSet Details</PageTitle>
        </FlexRow>
        <Col style={{ flex: 1, gap: '12px', marginBottom: '12px' }}>
          {!isReadOnly && (
            <Button
              text="Add Valuesets"
              style={{ minHeight: '40px', minWidth: '150px' }}
              onClick={() => router.push(`${router.asPath}/search`)}
            />
          )}
          {updateVSetsButton}
        </Col>
      </Row>
      <DT
        // @ts-expect-error
        data={progValueSetDets?.data}
        keyField="keyField"
        persistTableHead={true}
        // @ts-expect-error
        columns={columns}
        theme="aphl"
        pagination
        highlightOnHover={true}
        onRowClicked={(row) => {
          router.push(`/programs/${programId}/valuesets/${row?.valueSet?.id}`)
        }}
        fixedHeader // TODO: Should we remove? adds an additional scrollbar
        // @ts-expect-error
        customStyles={customStyles}
        progressPending={pageLoading || vSetsLoading}
        progressComponent={<LoadingIndicator />}
      />
    </>
  )
}

export default ProgramValueSetDetails
