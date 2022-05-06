import React, { useMemo, useState, ChangeEvent } from 'react'
import type { NextPage } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Select from 'react-select'
import DT from 'react-data-table-component'
import { PageTitle } from '@/components/Typography'
import { SearchInput, StyledLabel } from '@/components/SearchInput'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { IconButton } from '@/components/buttons/IconButton'
import { FieldTitle, FieldValue, ItemWrapper } from '..'
import { useGetConditions } from '@/hooks/useGetConditions'

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Col = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
`

const Li = styled.li`
  list-style-type: none;
  padding: 4px 6px;
  margin-bottom: 2px;
  border-radius: 8px;
  background-color: var(--theme-100);
  &:nth-of-type(2) {
    background-color: #D0ECEF;
  }
`

const Ul = styled.ul`
  padding-left: 0px;
  &:nth-child(even)  {
    background-color: red;
  }
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

const formatConditions = (conditionsList) => {
  const list = conditionsList?.map(c => (
    c?.concept?.map(item => ({
      system: c.system,
      version: c.version,
      code: item.code,
      display: item.display
    }))
  ))
  // sort by display
  return list?.flat()?.sort((firstItem, secondItem) => firstItem.display.toUpperCase().localeCompare(secondItem.display.toUpperCase()))
}

const buildConditionOptions = (conditions) => {
  return conditions.map(c => ({ value: c.code, label: c.display }))
}

const buildGroupOptions = (groupVsets) => {
  console.log(groupVsets)
  return groupVsets.map(g => ({ value: g.url, label: g.title }))
}

const ProgramValueSetDetails: NextPage = () => {
  const router = useRouter()
  const identifier = router.query.id as string
  const [findInVsName, setFindInVsName] = useState('')
  const progValueSetDets = useGetProgramValueSetDetails(identifier, findInVsName)
  const conditions = useGetConditions()
  
  const formattedConditions = formatConditions(conditions)
  const { groupsInProgram } = progValueSetDets

  const alphabetizedGroups = groupsInProgram?.sort((firstItem, secondItem) => firstItem.title.toUpperCase().localeCompare(secondItem.title.toUpperCase()))
  

  const onClick = () => {
    router.push('/valuesets')
  }
    const columns = useMemo(() => [
    {
      name: 'Name',
      selector: (row: fhir4.Library) => row.title,
      sortable: true,
      maxWidth: '350px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: fhir4.Library) => row.version,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'Conditions',
      selector: (row: fhir4.Library) => row.conditions,
      sortable: true,
      maxWidth: '300px',
      wrap: true,
      cell: (row: fhir4.Library) => (
        <Col>
          <Ul>
            {row?.conditions?.map(c => <Li key={c?.display}>{c?.display}</Li>)}
          </Ul>
        </Col>
      )
    },
    {
      name: 'Groups',
      selector: (row: fhir4.Library) => row.groups,
      sortable: true,
      maxWidth: '250px',
      wrap: true,
      cell: (row: fhir4.Library) => (
        <Col>
          <Ul>
            {row?.groups?.map(g => <Li key={g?.title}>{g?.title}</Li>)}
          </Ul>
        </Col>
      )
      
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
          type='delete'
          style={{ backgroundColor: 'darkRed' }}
        />
      )
    }
  ], [router])

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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFindInVsName(e.target.value)}
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
                <Select classNamePrefix='groups' inputId='groups-selector' isMulti options={buildGroupOptions(alphabetizedGroups)}/>
              </SelectGroup>
            )}
            {formattedConditions && (
              <SelectGroup>
                <StyledLabel id="aria-label" htmlFor="input-selector">
                  Conditions
                </StyledLabel>
                <Select classNamePrefix='conditions' inputId='input-selector' isMulti options={buildConditionOptions(formattedConditions)}/>
              </SelectGroup>
            )}
            <ButtonContainer>
              <IconButton
                type='search'
                onClick={(e) => handleFilterResults(e)}
              />
            </ButtonContainer>
          </SelectContainer>
        </div>
      </SearchOptions>
      <DT
        data={progValueSetDets?.data}
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
