import { useMemo } from 'react'
import DataTable from 'react-data-table-component'
import LoadingIndicator from './LoadingIndicator'
import { approvalFormParams } from './ApproveForm/types'
import { customTableStyles } from './tables/themes'
import { ToString } from '@/types/grouperTypes'

interface TableData {
  date: string
  user: string
  type: string
  text: string
  version: string
  reference: string
}

interface Error {
  type: 'delete_failed'
  message: string
}

const ApprovalDetailList = ({
  assessments,
  loading = false
}: {
  assessments?: ToString<Partial<approvalFormParams>>[]
  loading?: boolean
}) => {
  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Date',
        selector: (row: TableData) => row.date!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Type',
        selector: (row: TableData) => row.type!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Text',
        selector: (row: TableData) => row.text!,
        wrap: true
      },
      {
        name: 'Version',
        selector: (row: TableData) => row.version!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'User',
        selector: (row: TableData) => row.user!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Reference',
        selector: (row: TableData) => row.reference!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      }
    ]

    return fields
  }, [])

  return (
    <>
      <DataTable
        theme="aphl"
        customStyles={customTableStyles('readonly')}
        progressPending={loading}
        progressComponent={<LoadingIndicator />}
        columns={columns}
        data={
          assessments?.map((dataObj, i) => {
            return {
              id: `${dataObj.artifactCommentType}_${dataObj.approvalDate}_${i}`,
              date: dataObj.approvalDate || '-',
              user: dataObj.artifactCommentUser || '-',
              type: dataObj.artifactCommentType || '',
              text: dataObj.artifactCommentText || '-',
              reference: dataObj.artifactCommentReference || '-',
              version: dataObj.artifactCommentTarget?.split('|')?.pop() || '-'
            }
          }) || []
        }
        pagination
        paginationPerPage={10}
      />
    </>
  )
}

export { ApprovalDetailList }
