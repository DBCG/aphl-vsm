import React, { useEffect, useMemo, useState } from 'react'
import type { NextPage } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Select from 'react-select'
import DT from 'react-data-table-component'
import toast, { Toaster } from 'react-hot-toast'
import { PageTitle } from '@/components/Typography'
import { SearchInput, StyledLabel } from '@/components/SearchInput'
import { IconButton } from '@/components/buttons/IconButton'
import { Button } from '@/components/buttons/Button'
import { FieldTitle } from '..'
import { DataItem, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { formatConditionsComposeInclude, ConditionItem, ConditionInfo, ConditionToUpdate } from '@/helpers/conditionHelpers'
import { getSession, GetSessionParams } from 'next-auth/react'

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Row = styled.div`
  display: flex;
  justify-content: space-between;
`

const SearchOptions = styled.form`
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  padding-left: 0;

  .groups__control, .conditions__control {
    min-width: 300px;
  }

  .groups__menu, .conditions__menu {
    z-index: 100000;
  }
`

const TextInputContainer = styled.div`
  max-width: 250px;
  display: inline-block;
`

const SelectContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  column-gap: 12px;
  align-items: center;
`

const SelectGroup = styled.div`
  display: flex;
  flex-direction: column;
`

const SelectInputContainer = styled.div`
  width: 400px;
`

const Id = styled(PageTitle).attrs({
  as: 'span'
})`
  font-size: 20px;
`

interface GroupInfoItem {
  label: string,
  value: string
}

interface GroupUpdateItem {
  canonical?: string,
  groupInfo?: GroupInfoItem[]
}

const buildGroupOptions = (groupVsets: fhir4.ValueSet[]) => {
  return groupVsets?.map(g => ({
    value: g.id,
    label: g.title?.replace('_', ' '),
    id: g.id
    // dataId: `${g.id}${g.title}`
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
  // filter updates
  const [findInVsName, setFindInVsName] = useState('')
  const [activeGroups, setActiveGroups] = useState([])
  const [activeConditions, setActiveConditions] = useState([])
  // updates that happen via multiselects within table
  const [conditionToUpdate, setConditionToUpdate] = useState({} as ConditionToUpdate)
  const [updateVsGroups, setUpdateVsGroups] = useState({} as GroupUpdateItem)
  // returned data from PUT operations
  const [updatedGrouperValuesets, setUpdatedGrouperValueSets] = useState([])
  const [updatedValueSet, setUpdatedValueSet] = useState<fhir4.ValueSet>()
  // loading states
  const [grouperLoading, setGrouperLoading] = useState(false)
  const [conditionLoading, setConditionLoading] = useState(false)

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

  const progValueSetDets = useGetProgramValueSetDetails(
    programId,
    findInVsName,
    activeGroups,
    activeConditions,
    updatedValueSet,
    updatedGrouperValuesets
  )

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

  const columns = useMemo(() => [
    {
      name: 'Name',
      selector: (row: DataItem) => row.title,
      sortable: true,
      maxWidth: '350px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: DataItem) => row.version,
      sortable: true,
      maxWidth: '80px',
      wrap: true
    },
    {
      name: 'Steward',
      selector: (row: DataItem) => row.valueSet.publisher,
      sortable: true,
      maxWidth: '80px',
      wrap: true
    },
    {
      name: 'Conditions',
      selector: (row: DataItem) => row.valueSet,
      sortable: false,
      wrap: true,
      cell: (row: DataItem) => {
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
      name: 'Groups',
      selector: (row: DataItem) => row.groups,
      sortable: false,
      wrap: true,
      cell: (row: DataItem) => {
        const selectedOptions = row?.groups?.map(i => ({ label: i?.title?.replace('_', ' '), value: i?.id }))
        return (
          <SelectInputContainer>
            <Toaster/>
            <Select
              isClearable={false}
              classNamePrefix='groups'
              inputId='groups-selector'
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
      name: 'Remove ValueSet',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      maxWidth: '150px',
      cell: (row: fhir4.Library) => (
        <IconButton
          onClick={() => router.push(`/programs/${row.id}`)}
          buttonContext='delete'
          style={{ backgroundColor: 'darkRed' }}
        />
      )
    }
  ], [router, groupsInProgram, allConditions])

  const handleNameSearch = (e: React.ChangeEvent<Element>) => {
    const target = e.target as HTMLInputElement;
    setFindInVsName(target.value)
  }
  return (
    <>
      <Row>
        <PageTitle>Program ValueSet Details
          <Image width={24} height={24} alt='' src='/images/right-chevron.svg' />
          <Id><FieldTitle>ID</FieldTitle>{programId}</Id>
        </PageTitle>
        <Button text='Add Valuesets'
          style={{ maxHeight: '60px'}}
          onClick={() => router.push(`${router.asPath}/search`)}
        />
      </Row>
      <SearchOptions>
        <p style={{ color: 'var(--theme-500)', fontWeight: 'bold', display: 'inline-block' }}>Filter Valuesets</p>
        <div>
          <SelectContainer>
            <TextInputContainer>
              <SearchInput
                onChange={(e) => handleNameSearch(e)}
                label='ValueSet Name'
                id='VSearch'
                style={{
                  display: 'inline-block',
                  height: '36px'
                }}
              />
            </TextInputContainer>
            {alphabetizedGroups && (
              <SelectGroup>
                <StyledLabel id="aria-label" htmlFor="groups-selector">
                  Groups
                </StyledLabel>
                <Select
                  classNamePrefix='groups'
                  inputId='groups-selector'
                  isMulti
                  options={buildGroupOptions(alphabetizedGroups)}
                  onChange={(e) => {
                    // @ts-expect-error
                    setActiveGroups(e)
                  }}
                />
              </SelectGroup>
            )}
            {allConditions && (
              <SelectGroup>
                <StyledLabel id="aria-label" htmlFor="conditions-selector">
                  Conditions
                </StyledLabel>
                <Select
                  classNamePrefix='conditions'
                  inputId='conditions-selector'
                  isMulti
                  options={buildConditionOptions(allConditions)}
                  // @ts-expect-error
                  onChange={(e) => {setActiveConditions(e)}}
                />
              </SelectGroup>
            )}
          </SelectContainer>
        </div>
      </SearchOptions>
      <DT
        // @ts-expect-error
        data={progValueSetDets?.data}
        // @ts-expect-error
        columns={columns}
        theme='aphl'
        pagination
        fixedHeader
        customStyles={customStyles}
        // keyField='dataId'
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
