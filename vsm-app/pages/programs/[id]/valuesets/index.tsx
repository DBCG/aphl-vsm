import React, { useEffect, useMemo, useState } from 'react'
import type { NextPage } from 'next'
import styled from 'styled-components'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { getSession, GetSessionParams } from 'next-auth/react'
import Select from 'react-select'
import DT from 'react-data-table-component'
import toast, { Toaster } from 'react-hot-toast'
import { PageTitle } from '@/components/Typography'
import { FilterInput } from '@/components/FilterInput'
import { IconButton } from '@/components/buttons/IconButton'
import { Button } from '@/components/buttons/Button'
import { FieldTitle } from '..'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { getTerminologySource } from '@/helpers/valueSetHelpers'
import { useDebounce } from '@/hooks/useDebounce'
import { formatConditionsComposeInclude, ConditionItem, ConditionInfo, ConditionToUpdate } from '@/helpers/conditionHelpers'
import LoadingIndicator from '@/components/LoadingIndicator'

interface GroupItem {
  id: string,
  title: string,
  url: string
}

interface TableRow {
  programName: string,
  programId: string,
  canonical: string,
  title: string,
  version: string,
  valueSet: fhir4.ValueSet,
  groups: GroupItem[]
}

export const customStyles = {
  headCells: {
    style: {
      padding: '16px',
      overflow: 'visible'
    }
  },
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px',
      whiteSpace: 'normal !important',
      overflow: 'visible'
    }
  }
}

const Row = styled.div`
  display: flex;
  justify-content: space-between;
`

export const SelectInputContainer = styled.div`
  width: 100%;
`

export const SelectInputTitle = styled.p`
  padding-bottom: 8px;
  margin: 0;
  margin-right: 12px;
`

const Id = styled(PageTitle).attrs({
  as: 'span'
})`
  font-size: 20px;
`

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
`

const FlexCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`

interface GroupInfoItem {
  label: string,
  value: string
}

interface GroupUpdateItem {
  canonical?: string,
  groupInfo?: GroupInfoItem[]
}

interface DeleteParams {
  vsCanonical: string | undefined,
  grouperCanonicals: string[] | undefined
}

const buildGroupOptions = (groupVsets: fhir4.ValueSet[]) => {
  return groupVsets?.map(g => ({
    value: g.id,
    label: g.title?.replace('_', ' '),
    id: g.id
  }))
}

const buildConditionOptions = (conditions: ConditionItem[], selectedOptions?: ConditionInfo[] | undefined) => {
  const selectedCodes = selectedOptions?.map((s) => s?.value?.code)?.filter(x => x)
  const flattenedConditions = conditions?.flat(2)
  const result = flattenedConditions?.map(c => (
    {
      value: {
        system: c.system,
        version: c.version,
        code: c.code,
        text: c.display
      },
      label: c.display,
      dataId: `${c.system}${c.code}${c.display}`
    }))?.filter(option => !selectedCodes?.includes(option?.value?.code))
  return result
}

const ProgramValueSetDetails: NextPage = () => {
  const router = useRouter()
  const programId = router.query.id as string

  // updates that happen via multiselects within table
  const [conditionToUpdate, setConditionToUpdate] = useState({} as ConditionToUpdate)
  const [updateVsGroups, setUpdateVsGroups] = useState({} as GroupUpdateItem)
  // returned data from PUT operations
  const [updatedGrouperValuesets, setUpdatedGrouperValueSets] = useState([])
  const [updatedValueSet, setUpdatedValueSet] = useState<fhir4.ValueSet>()

  // loading states
  const [pageLoading, setPageLoading] = useState(true)
  const [grouperLoading, setGrouperLoading] = useState(false)
  const [groupersUpdated, setGroupersUpdated] = useState(false)
  const [conditionLoading, setConditionLoading] = useState(false)
  const [vSetsLoading, setVSetsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<boolean | string>(false)

  const defaultFilters = {
    findInVsName: '',
    findInSteward: '',
    findInVersion: '',
    activeConditions: [],
    activeGroups: []
  }

  // all available filters
  const [filters, setFilters] = useState(defaultFilters)
  
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
        grouperCanonicals,
      }

      const result = fetch(`/api/programs/${programId}/groupers`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }).then(res => res.json())

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

  useEffect(() => {
    let endpoint = `/api/programs/${programId}/details/valuesets/conditions`
    const postUpdate = async () => {
      if (conditionToUpdate?.conditionInfo) {
        setConditionLoading(true)
        try {
          let updatedVs = fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(conditionToUpdate)
          }).then(res => res.json())
    
          let json = await updatedVs
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
    let endpoint = `/api/programs/${programId}/details/valuesets/groups`
    const postUpdate = async () => {
      if (updateVsGroups?.groupInfo) {
        setGrouperLoading(true)
        let updatedVs = fetch(endpoint, {
          method: 'PUT',
          body: JSON.stringify(updateVsGroups)
        }).then(res => res.json())

        let json = await updatedVs
        setUpdatedGrouperValueSets(json)
        setGrouperLoading(false)
      }
    }
    postUpdate()
  }, [updateVsGroups.groupInfo, programId])

  const progValueSetDets = useGetProgramValueSetDetails({
    id: programId,
    updatedValueSet, // this gets updated when a user adds a condition
    updatedGrouperValuesets, // this gets updated when a user adds a vs to a grouper
    ...debouncedFilters
  })

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
  // @ts-expect-error
  let groupsInProgram = progValueSetDets?.groupsInProgram
  
  const alphabetizedGroups = groupsInProgram?.sort(
    (firstItem: fhir4.ValueSet, secondItem: fhir4.ValueSet) => {
      if (typeof firstItem.title === 'string' && typeof secondItem.title === 'string') {
        return firstItem.title.toUpperCase().localeCompare(secondItem.title.toUpperCase())
      }
      // if not enough information to order, just keep as they are
      return 0
    }
  )

  const handleFilterChange = (e: string | React.ChangeEvent<HTMLInputElement>, type: string) => {
    const updatedFilters = { ...filters, [type]: e }
    setFilters(updatedFilters)
  }

  const columns = useMemo(() => [
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
          <SelectInputTitle>Version</SelectInputTitle>
          <FilterInput
            // @ts-ignore-next-line
            onChange={(e) => handleFilterChange(e.target.value, 'findInVersion')}
            style={{ height: '30px' }}
          />
        </div>
      ),
      id: 'vs-version-search',
      selector: (row: TableRow) => row.version,
      sortable: false,
      maxWidth: '80px',
      wrap: true
    },
    {
      name: (
        <div>
         <SelectInputTitle>Steward</SelectInputTitle>
          <FilterInput
            // @ts-ignore-next-line
            onChange={(e) => handleFilterChange(e.target.value, 'findInSteward')}
            style={{ height: '30px' }}
          />
        </div>
      ),
      selector: (row: TableRow) => row.valueSet.publisher,
      sortable: true,
      maxWidth: '80px',
      wrap: true
    },
    {
      name: (
        <div style={{ marginTop: '20px' }}>
         <SelectInputTitle>Source</SelectInputTitle>
         <p style={{ fontSize: '90%' }}>* source inferred by url</p>
        </div>
      ),
      selector: (row: TableRow) => row.valueSet,
      sortable: true,
      maxWidth: '120px',
      wrap: true,
      cell: (row: TableRow) => {
        const terminologyInfo = getTerminologySource(row.valueSet)
        return (
          <div>{terminologyInfo.value}{ terminologyInfo.hasExtension ? null : '*' }</div>
        )
      }
    },
    {
      name: (
        <SelectInputContainer>
          Conditions
          <Select
            placeholder='Filter conditions'
            classNamePrefix='conditions'
            inputId='conditions-selector'
            instanceId='conditions-selector'
            isMulti
            options={buildConditionOptions(allConditions)}
            // @ts-ignore-next-line
            onChange={(e) => {handleFilterChange(e, 'activeConditions')}}
          />
        </SelectInputContainer>
      ),
      id: 'value-set-conditions',
      selector: (row: TableRow) => row.valueSet,
      sortable: false,
      wrap: true,
      cell: (row: TableRow) => {
        const selectedOptions = row?.valueSet?.useContext?.map(i => {
          if (i?.code?.code === 'focus' && i?.code?.system?.endsWith('/usage-context-type')) {
            return ({
              label: i?.valueCodeableConcept?.text,
              value: {
                system: i?.valueCodeableConcept?.coding?.[0]?.system,
                code: i?.valueCodeableConcept?.coding?.[0]?.code,
                text: i?.valueCodeableConcept?.text
              }
            })
            }
        }).filter(x => x) as ConditionInfo[]
        return (
          <SelectInputContainer>
            <Select
              instanceId='condition-selector'
              isMulti={true}
              options={buildConditionOptions(allConditions, selectedOptions)}
              value={selectedOptions}
              isLoading={conditionLoading && row?.canonical === conditionToUpdate?.canonical}
              // TODO should block add if already exists
              onChange={(conditionInfo) => conditionInfo && setConditionToUpdate({
                // @ts-expect-error
                canonical: row.canonical, version: row.version, conditionInfo
              })}
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
            placeholder='Filter groups'
            classNamePrefix='groups'
            inputId='groups-selector'
            instanceId='groups-selector'
            isMulti
            options={buildGroupOptions(alphabetizedGroups)}
            // @ts-ignore-next-line
            onChange={(e) => {handleFilterChange(e, 'activeGroups')}}
          />
        </SelectInputContainer>
      ),
      id: 'value-set-groups',
      selector: (row: TableRow) => row.groups,
      sortable: false,
      allowOverflow: true,
      wrap: true,
      cell: (row: TableRow) => {
        const selectedOptions = row?.groups?.map(i => ({ label: i?.title?.replace('_', ' '), value: i?.id }))
        return (
          <SelectInputContainer>
            <Toaster/>
            <Select
              isClearable={false}
              classNamePrefix='groups'
              inputId='groups-selector'
              instanceId='groups-selector'
              isMulti={true}
              isLoading={grouperLoading && updateVsGroups?.canonical === row?.canonical}
              // @ts-expect-error
              options={buildGroupOptions(groupsInProgram)}
              value={selectedOptions}
              onChange={e => {
                if (e.length === 0) {
                  toast.error('ValueSets must belong to a group.\nPlease add one before deleting.', {
                    id: `${row.canonical}`,
                    position: 'top-right',
                    style: {
                      borderRadius: 0
                    }
                  })
                  return
                }
                // @ts-expect-error
                setUpdateVsGroups({ canonical: row?.canonical, groupInfo: e })
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
      selector: (row: TableRow) => row,
      sortable: false,
      wrap: true,
      maxWidth: '150px',
      cell: (row: TableRow) => (
        <FlexRow style={{ justifyContent: 'center' }}>
          <FlexCol>
            <IconButton
              onClick={async () => {
                await handleDelete({
                  vsCanonical: row?.valueSet?.url,
                  grouperCanonicals: row.groups.map(g => g.url)
                })
                window.location.reload()
              }}
              buttonContext='delete'
              style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
            />
            {isDeleting === row?.valueSet?.url && <p><em>Deleting...</em></p>}

          </FlexCol>
        </FlexRow>
      )
    }
  ], [router, groupsInProgram, allConditions])

  return (
    <>
      <Row>
        <FlexRow>
          <PageTitle>Program ValueSet Details</PageTitle>
          <Image width={24} height={24} alt='' src='/images/right-chevron.svg' />
          <Id><FieldTitle>ID</FieldTitle>{programId}</Id>
        </FlexRow>
        <Button text='Add Valuesets'
          style={{ maxHeight: '60px', minWidth: '150px' }}
          onClick={() => router.push(`${router.asPath}/search`)}
        />
      </Row>
      <DT
        // @ts-expect-error
        data={progValueSetDets?.data}
        persistTableHead={true}
        // @ts-expect-error
        columns={columns}
        theme='aphl'
        pagination
        fixedHeader
        // @ts-expect-error
        customStyles={customStyles}
        progressPending={pageLoading || vSetsLoading}
        progressComponent={<LoadingIndicator/>}
      />
    </>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: { session }
  }
}

export default ProgramValueSetDetails
