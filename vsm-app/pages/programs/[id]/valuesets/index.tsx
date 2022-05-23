import React, { useEffect, useMemo, useState } from 'react'
import type { NextPage } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Select from 'react-select'
import DT from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import { SearchInput, StyledLabel } from '@/components/SearchInput'
import { IconButton } from '@/components/buttons/IconButton'
import { FieldTitle } from '..'
import { DataItem, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { fhirCdrClient } from 'fhirClients'

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
interface ConditionItem {
  system: string,
  version: string,
  code: string,
  display: string
}

export const formatConditionsValueSet = (conditionsList: any) => {
  const list = conditionsList?.map((c: any) => (
    c?.concept?.map((item: any) => ({
      system: c.system,
      version: c.version,
      code: item.code,
      display: item?.designation?.find((d: fhir4.CodeSystemConceptDesignation) => d?.use?.code === 'synonym')?.value || c?.display || ''
    }))
  )).flat()
  // sort by display
  return list?.sort((firstItem: ConditionItem, secondItem: ConditionItem) => (
    firstItem.display.toUpperCase().localeCompare(secondItem.display.toUpperCase()))
  )
}

const buildGroupOptions = (groupVsets: fhir4.ValueSet[]) => {
  return groupVsets?.map(g => ({ value: g.url, label: g.title }))
}

const buildConditionOptions = (conditions: ConditionItem[]) => {
  const flattenedConditions = conditions?.flat(2)
  const result = flattenedConditions?.map(c => (
    {
      value: { system: c.system, version: c.version, code: c.code, text: c.display },
      label: c.display
    }))
  return result
}

const ProgramValueSetDetails: NextPage = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const [findInVsName, setFindInVsName] = useState('')
  const [activeGroups, setActiveGroups] = useState([])
  const [activeConditions, setActiveConditions] = useState([])
  const [conditionToUpdate, setConditionToUpdate] = useState([])

  const [updatedValueSet, setUpdatedValueSet] = useState<fhir4.ValueSet>()

  console.log('updated valuesets in FE: ', updatedValueSet)

  useEffect(() => {
    let endpoint = `/api/programs/${programId}/details/valuesets`
    const postUpdate = async () => {
      let updatedVs = fetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(conditionToUpdate)
      }).then(res => res.json())

      let json = await updatedVs
      console.log('updatedVs: ', updatedVs)
      setUpdatedValueSet(json)
    }

    postUpdate()

  }, [conditionToUpdate, programId])

  const progValueSetDets = useGetProgramValueSetDetails(
    programId,
    findInVsName,
    activeGroups,
    activeConditions,
    updatedValueSet
  )
  
  useEffect(() => {
    console.log('dets: ', progValueSetDets)
  }, [progValueSetDets])

  const conditions = useGetConditions()
  const allConditions = formatConditionsValueSet(conditions)
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
      name: 'Conditions',
      selector: (row: DataItem) => row.valueSet,
      sortable: false,
      wrap: true,
      cell: (row: DataItem) => {
        console.log('row: ', row)
        const selectedOptions = row?.valueSet?.useContext?.map(i => {
          console.log('i: ', i)
          if (i?.code?.code === 'focus' && i?.code?.system?.endsWith('/usage-context-type')) {
            return ({
              label: i?.valueCodeableConcept?.text,
              value: {
                system: i?.valueCodeableConcept?.coding?.[0]?.system,
                // version: i?.valueCodeableConcept?.text,
                code: i?.valueCodeableConcept?.coding?.[0]?.code,
                text: i?.text
              }
            })
            }
          
        })
  
        // })
        return (
          <SelectInputContainer>
            <Select
              isMulti={true}
              // @ts-expect-error
              options={buildConditionOptions(allConditions)}
              value={selectedOptions}
              // onChange={(e) => console.log(e)}
              // should block add if already exists
              onChange={(conditionInfo) => conditionInfo && setConditionToUpdate({
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
        const selectedOptions = row?.groups?.map(i => ({ label: i?.title, value: i?.id }))
        return (
          <SelectInputContainer>
            <Select
              classNamePrefix='groups'
              inputId='groups-selector'
              isMulti={true}
              // @ts-expect-error
              options={buildGroupOptions(groupsInProgram)}
              value={selectedOptions}
              // @ts-expect-error
              // onChange={(e) => {setActiveGroups(e)}}
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
                  // @ts-expect-error
                  onChange={(e) => {setActiveGroups(e)}}
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
      />
    </>
  )
}

export default ProgramValueSetDetails
