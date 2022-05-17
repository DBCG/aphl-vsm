import React, { useMemo, useState, ChangeEvent, useEffect } from 'react'
import type { NextPage } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Modal from 'react-modal'
import Select from 'react-select'
import DT from 'react-data-table-component'
import { DataItem, useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetConditions } from '@/hooks/useGetConditions'
import { PageTitle } from '@/components/Typography'
import { SearchInput, StyledLabel } from '@/components/SearchInput'
import { IconButton } from '@/components/buttons/IconButton'
import { FieldTitle } from '..'
import { useUpdateVSConditions } from '@/hooks/useUpdateVSConditions'

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

const ButtonContainer = styled.div`
  width: 36px;
  height: 36px;
  margin-top: 16px;
`

const Id = styled(PageTitle).attrs({
  as: 'span'
})`
  font-size: 20px;
`

const SelectInputContainer = styled.div`
  min-width: 300px;
`

interface ConditionItem {
  system: string,
  version: string,
  code: string,
  display: string
}

// fix types when actually using conditions
const formatConditions = (conditionsList: any) => {
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

const buildConditionOptions = (conditions: ConditionItem[]) => {
  console.log('conditions: ', conditions)
  const result = conditions.map(c => ({ value: { system: c.system, version: c.version, code: c.code }, label: c.display }))
  return result
}

const buildGroupFilterOptions = (groupVsets: fhir4.ValueSet[]) => {
  return groupVsets?.map(g => ({ value: g.url, label: g.title }))
}

const buildGroupOptions = (groupVsets: fhir4.ValueSet[]) => {
  const result = groupVsets?.map(g => (
    { value: g?.id, label: g?.title }
  ))

  return result
}

const ProgramValueSetDetails: NextPage = () => {
  const router = useRouter()
  const identifier = router.query.id as string
  const [findInVsName, setFindInVsName] = useState('')
  const [filteredGroups, setFilteredGroups] = useState([])
  const [filteredConditions, setFilteredConditions] = useState([])
  const [updateVSConditions, setUpdateVSConditions] = useState({ canonical: '', version: '', conditionInfo: []})
  const progValueSetDets = useGetProgramValueSetDetails(identifier, findInVsName, filteredGroups, filteredConditions)
  const conditions = useGetConditions()
  
  const formattedConditions = formatConditions(conditions)
  console.log('filtered conditions: ', filteredConditions)

  const { canonical, version, conditionInfo } = updateVSConditions
  useUpdateVSConditions(canonical, version, conditionInfo)

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
  
  const handleFilterResults = (e: React.MouseEvent<Element, MouseEvent>) => {
    e.preventDefault()
  }

  const columns = useMemo(() => [
    {
      name: 'Name',
      selector: (row: DataItem) => row.title,
      sortable: false,
      maxWidth: '350px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: DataItem) => row.version,
      sortable: false,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'Conditions',
      selector: (row: DataItem) => row.conditions,
      sortable: false,
      wrap: true,
      cell: (row: DataItem) => {
        console.log('row: ', row)
        console.log('testing 1: ', buildConditionOptions(formattedConditions))
        console.log('testing 2: ', formattedConditions)
        const selectedOptions = row?.conditions?.map(i => (
          { label: i?.feLabel, value: i?.code }
        ))
        return (
          <SelectInputContainer>
            <Select
              isMulti={true}
              options={buildConditionOptions(formattedConditions)}
              value={selectedOptions}
              onChange={(conditionInfo) => conditionInfo && setUpdateVSConditions({ canonical: row.canonical, version: row.version, conditionInfo })}
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
        console.log('selectedOptions: ', selectedOptions)
        return (
          <SelectInputContainer>
            <Select
              classNamePrefix='groups'
              inputId='groups-selector'
              isMulti={true}
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
  ], [router, formattedConditions, groupsInProgram, progValueSetDets.data])
  
  const handleNameSearch = (e: React.ChangeEvent<Element>) => {
    const target = e.target as HTMLInputElement;
    setFindInVsName(target.value)
  }

  return (
    <>
      <Row>
        <PageTitle>Program ValueSet Details
          <Image width={24} height={24} alt='' src='/images/right-chevron.svg' />
          <Id><FieldTitle>ID</FieldTitle>{identifier}</Id>
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
            {formattedConditions && (
              <SelectGroup>
                <StyledLabel id="aria-label" htmlFor="input-selector">
                  Conditions
                </StyledLabel>
                <Select
                  classNamePrefix='conditions'
                  inputId='input-selector'
                  isMulti
                  options={buildConditionOptions(formattedConditions)}
                  // @ts-expect-error
                  onChange={(e) => {setFilteredConditions(e)}}
                />
              </SelectGroup>
            )}
            {alphabetizedGroups && (
              <SelectGroup>
                <StyledLabel id="aria-label" htmlFor="groups-filter-selector">
                  Groups
                </StyledLabel>
                <Select
                  classNamePrefix='groups'
                  inputId='groups-filter-selector'
                  isMulti
                  options={buildGroupFilterOptions(alphabetizedGroups)}
                  // @ts-expect-error
                  onChange={(e) => {setFilteredGroups(e)}}
                />
              </SelectGroup>
            )}
            <ButtonContainer>
              <IconButton
                type='submit'
                buttonContext='search'
                onClick={(e) => handleFilterResults(e)}
              />
            </ButtonContainer>
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
