import React, { useMemo } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import { ProgramDetailTable } from '@/components/ProgramDetailTable'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { IconButton } from '@/components/buttons/IconButton'

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
  flex-direction: column;
`

const Ul = styled.ul`
  padding-left: 16px;
`

const ProgramValueSetDetails: NextPage = () => {
  const router = useRouter()
  const identifier = router.query.id as string
  const progValueSetDets = useGetProgramValueSetDetails(identifier)

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
        <Row>
          <Ul>
            {row?.conditions?.map(c => <li>{c?.display}</li>)}
          </Ul>
        </Row>
      )
    },
    {
      name: 'Groups',
      selector: (row: fhir4.Library) => row.groups,
      sortable: true,
      maxWidth: '250px',
      wrap: true,
      cell: (row: fhir4.Library) => (
        <Row>
          <Ul>
            {row.groups.map(g => <li>{g.title}</li>)}
          </Ul>
        </Row>
      )
      
    },
    {
      name: 'Remove',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      maxWidth: '100px',
      cell: (row: fhir4.Library) => (
        <IconButton
          onClick={() => router.push(`/programs/${row.id}`)}
          type='delete'
        />
      )
    }
  ], [router])

  return (
    <DT
      data={progValueSetDets}
      columns={columns}
      theme='aphl'
      pagination
      fixedHeader
      customStyles={customStyles}
    />
  )
}

export default ProgramValueSetDetails
