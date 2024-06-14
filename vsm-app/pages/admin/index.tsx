import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import styled from 'styled-components'
import { debounce } from 'lodash'
import DT from 'react-data-table-component'
import { fetchWithProgram } from '@/utils'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import { LoadingModal } from '@/components/modals/LoadingModal'
import { ReleaseModal } from '@/components/modals/ReleaseModal'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { ErrorMessage } from '@/components/ErrorMessage'
import { StatusChip } from '@/components/data-display/Chips'
import { customTableStyles } from '@/components/tables/themes'
import { formatDateForTable } from '@/helpers/formatDates'
import { getLatestFromList } from '@/helpers/server/semverHelpers'
import { TerminologyServerForm } from '@/components/TerminologyServerForm'
import { Checkbox } from '@mui/material'

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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
`

export interface StatusProps {
  status: string
  experimental: boolean
}

interface Error {
  error?: string
}

interface ProgramListResponse {
  programs: fhir4.Library[]
  total: number
}

interface PaginationState {
  page: number
  countPerPage: number
  searchTotal: number | null
}

export interface ReleasePayload {
  programId: string
  releaseDescription?: string
  releaseLabel?: string
  effectiveStartDate: string | Date
  releaseAsVersion: string
}

const Programs: NextPage = () => {
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<fhir4.Endpoint[]>([
    {
      resourceType: 'Endpoint',
      status: 'active',
      address: 'http://cts.nlm.gov',
      name: 'VSAC',
      connectionType: { code: 'fhir', system: 'system' },
      payloadType: []
    }
  ])
  const activeRefs = useRef<Map<string, any> | null>(null)
  function getActiveList() {
    if (!activeRefs.current) {
      activeRefs.current = new Map()
    }
    return activeRefs.current
  }
  const columns = useMemo(
    () => [
      {
        name: 'Name',
        selector: (row: fhir4.Endpoint) => row.name || '',
        sortable: true,
        maxWidth: '8rem',
        wrap: true,
        center: true
      },
      {
        name: 'Endpoint',
        selector: (row: fhir4.Endpoint) => row.address,
        sortable: true,
        maxWidth: '15rem',
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
        name: 'Active',
        selector: (row: fhir4.Endpoint) => row.status === 'active',
        sortable: false,
        wrap: true,
        center: true,
        maxWidth: '3rem',
        cell: (row: fhir4.Endpoint) => (
          <ButtonWrapper>
            <Checkbox
              onChange={() => {
                // should dispatch a change
                if (row.status === 'active') {
                  row.status = 'off'
                } else {
                  row.status = 'active'
                }
              }}
              inputRef={(node) => {
                const map = getActiveList()
                if (node && row.id) {
                  map.set(row.id, node)
                } else if (row.id) {
                  map.delete(row.id)
                }
              }}
            />
          </ButtonWrapper>
        )
      },
      {
        name: 'Actions',
        selector: (row: fhir4.Library) => row.name || '',
        sortable: false,
        wrap: true,
        center: true,
        maxWidth: '3rem',
        cell: (row: fhir4.Library) => (
          <ButtonWrapper>
            <IconButton
              // onClick={() => {
              //   setError({})
              //   setProgramToRelease(row)
              // }}
              onClick={() => {}}
              buttoncontext={`mustApproveRelease-${row.status}`}
            />
            <IconButton
              // onClick={() => {
              //   setError({})
              //   setProgramToRelease(row)
              // }}
              onClick={() => {}}
              buttoncontext={`mustApproveRelease-${row.status}`}
            />
          </ButtonWrapper>
        )
      }
    ],
    [session]
  )
  return (
    <Col>
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>Administrator Tools</PageTitle>
      </Row>
      {/* <ErrorMessage error={error?.error || null} /> */}
      <TerminologyServerForm />
      <DT
        data={data}
        columns={columns}
        theme="aphl"
        pagination
        paginationServer
        // paginationTotalRows={pagination.searchTotal || 0}
        // paginationPerPage={pagination.countPerPage}
        // onChangePage={handlePageChange}
        // onChangeRowsPerPage={(newRowsPerPage, newPage) => setPagination({ ...pagination, page: newPage, countPerPage: newRowsPerPage })}
        // fixedHeader
        // highlightOnHover={true}
        // onRowClicked={(row) => router.push(`/programs/${row.id}`)}
        // customStyles={customTableStyles('clickable')}
        // progressPending={!programs?.length}
        progressComponent={<LoadingIndicator />}
      />
    </Col>
  )
}

export default Programs
