import type { NextPage } from 'next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import DT, { TableColumn } from 'react-data-table-component'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { formatDateForTable } from '@/helpers/formatDates'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@mui/material'
import { EndpointResponse } from '../api/endpoint'
import { PaginationState } from '@/components/Provisional/ProgramsTab'
import { useRouter } from 'next/router'
import { getAuthenticationTypeString } from '@/components/TerminologyServerForm'

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

const TerminologyEndpoints: NextPage = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<fhir4.Endpoint[]>([])
  const [error, setError] = useState({ error: '' })
  const router = useRouter()
  // Table Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    countPerPage: 10,
    searchTotal: 0
  })
  const fetchEndpoints = async (offset: number, count: number) => {
    const url = `/api/endpoint?_offset=${offset}&_count=${count}`
    return fetch(url)
      .then((res) => res.json())
      .then((res: EndpointResponse) => {
        setData(res.endpoints)
        // if we don't use the callback `react-exhaustive-deps` thinks this is a mutable function
        setPagination((current) => {
          if (res.total != current.searchTotal) {
            return { ...current, searchTotal: res.total }
          } else {
            return current
          }
        })
      })
      .catch((error) => setError({ error: error.error || error.toString() }))
  }
  useEffect(() => {
    setLoading(true)
    fetchEndpoints((pagination.page - 1) * pagination.countPerPage, pagination.page * pagination.countPerPage).finally(() =>
      setLoading(false)
    )
  }, [pagination.page, pagination.countPerPage])
  const handlePageChange = (newPage: number) =>
    setPagination((current) => {
      if (current.page != newPage) {
        return { ...current, page: newPage }
      } else {
        return current
      }
    })
  const columns: TableColumn<fhir4.Endpoint>[] = useMemo(
    () => [
      {
        name: 'Name',
        selector: (row: fhir4.Endpoint) => row.name || '',
        sortable: false,
        maxWidth: '12rem',
        wrap: true
      },
      {
        name: 'Endpoint',
        selector: (row: fhir4.Endpoint) => row.address,
        sortable: false,
        minWidth: '10rem',
        wrap: true
      },
      {
        name: 'Authentication',
        selector: (row: fhir4.Endpoint) => getAuthenticationTypeString(row.extension || []) || '',
        sortable: false,
        maxWidth: '8rem',
        wrap: true
      },
      {
        name: 'Last Updated',
        selector: (row: fhir4.Endpoint) => {
          const formattedDate = formatDateForTable(row?.meta?.lastUpdated, 'm/d/yyyy')
          return formattedDate
        },
        sortable: false,
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
                router.push(`/admin/edit-endpoint/${row.id}`)
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
    [pagination.countPerPage, pagination.page, router]
  )
  return (
    <Col>
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>Administrator Tools</PageTitle>
      </Row>
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <h4>Endpoints</h4>
        <Button onClick={() => router.push('/admin/create-endpoint')}>Create Endpoint</Button>
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
            if (newRowsPerPage !== current.countPerPage || newPage !== current.page) {
              if ((current.searchTotal || 0) < current.countPerPage && (current.searchTotal || 0) < newRowsPerPage) {
                current.countPerPage = newRowsPerPage
                return current
              }
              return { ...current, page: newPage, countPerPage: newRowsPerPage }
            } else {
              return current
            }
          })
        }
        progressPending={loading}
        progressComponent={<LoadingIndicator />}
      />
    </Col>
  )
}

export default TerminologyEndpoints
