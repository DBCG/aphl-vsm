import type { NextPage } from 'next'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { VSMSession } from '@/helpers/rolesHelper'
import { formatDateForTable } from '@/helpers/formatDates'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@mui/material'
import { EndpointResponse } from '../api/endpoint'
import { PaginationState } from '../programs'

const Col = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content;
`

const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`

export interface StatusProps {
  status: string
  experimental: boolean
}

export interface ReleasePayload {
  programId: string
  releaseDescription?: string
  releaseLabel?: string
  effectiveStartDate: string | Date
  releaseAsVersion: string
}

const TerminologyEndpoints: NextPage = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<fhir4.Endpoint[]>([])
  const [error, setError] = useState({ error: '' })
  // Table Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    countPerPage: 10,
    searchTotal: null
  })
  useEffect(() => {
    fetchEndpoints((pagination.page - 1) * pagination.countPerPage, pagination.page * pagination.countPerPage)
  }, [pagination.page, pagination.countPerPage])
  const fetchEndpoints = async (offset: number, count: number) => {
    const url = `/api/endpoint?_offset=${offset}&_count=${count}`
    setLoading(true)
    return fetch(url)
      .then((res) => res.json())
      .then((res: EndpointResponse) => {
        setData(res.endpoints)
        // if we don't use the callback `react-exhaustive-deps` thinks this is a mutable function
        // if (res.total != pagination.searchTotal) {
        setPagination((current) => {
          return { ...current, searchTotal: res.total }
        })
        // }
      })
      .catch((error) => setError({ error: error.error || error.toString() }))
      .finally(() => setLoading(false))
  }
  const handlePageChange = (newPage: number) =>
    setPagination((current) => {
      return { ...current, page: newPage }
    })
  const columns = useMemo(
    () => [
      {
        name: 'Name',
        selector: (row: fhir4.Endpoint) => row.name || '',
        sortable: true,
        maxWidth: '12rem',
        wrap: true
      },
      {
        name: 'Endpoint',
        selector: (row: fhir4.Endpoint) => row.address,
        sortable: true,
        minWidth: '10rem',
        wrap: true
      },
      {
        name: 'Last Updated',
        selector: (row: fhir4.Endpoint) => {
          const formattedDate = formatDateForTable(row?.meta?.lastUpdated, 'm/d/yyyy')
          return formattedDate
        },
        sortable: true,
        wrap: true,
        maxWidth: '8rem'
      },
      {
        name: 'Actions',
        selector: (row: fhir4.Endpoint) => row.name || '',
        sortable: false,
        wrap: true,
        center: true,
        maxWidth: '3rem',
        minWidth: '10rem',
        cell: (row: fhir4.Endpoint) => (
          <ButtonWrapper style={{ minWidth: '9rem', justifyContent: 'space-around' }}>
            <IconButton
              onClick={() => {
                window.location.href = `/admin-tools/endpoint/edit/${row.id}`
              }}
              buttoncontext={'edit'}
            />
            <IconButton
              onClick={() => {
                const url = `/api/endpoint/${row.id}`
                setLoading(true)
                fetch(url, { method: 'DELETE' })
                  .catch((error) => setError({ error: error.error || error.toString() }))
                  .finally(() => {
                    setLoading(false)
                    fetchEndpoints((pagination.page - 1) * pagination.countPerPage, pagination.page * pagination.countPerPage)
                  })
              }}
              buttoncontext="delete"
            />
          </ButtonWrapper>
        )
      }
    ],
    [pagination.countPerPage, pagination.page]
  )
  return (
    <Col>
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>Administrator Tools</PageTitle>
      </Row>
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <h4>Endpoints</h4>
        <Button onClick={() => (window.location.href = '/admin-tools/endpoint/new')}>Create Endpoint</Button>
      </Row>
      <ErrorMessage error={error?.error || null} />
      <DT
        data={data}
        columns={columns}
        theme="aphl"
        pagination
        paginationServer
        paginationTotalRows={pagination.searchTotal || 0}
        paginationPerPage={pagination.countPerPage}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={(newRowsPerPage, newPage) =>
          setPagination((current) => {
            return { ...current, page: newPage, countPerPage: newRowsPerPage }
          })
        }
        progressPending={loading}
        progressComponent={<LoadingIndicator />}
      />
    </Col>
  )
}

export default TerminologyEndpoints
