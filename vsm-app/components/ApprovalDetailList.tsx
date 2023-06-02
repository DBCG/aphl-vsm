import { useMemo } from 'react'
import { getSession, GetSessionParams, useSession } from 'next-auth/react'
import DataTable from 'react-data-table-component'
import LoadingIndicator from './LoadingIndicator'
import { approvalFormParams } from 'pages/programs/[id]/approve'
import { ToString } from '@/hooks/useGetProgramDetails'
import { customTableStyles } from './tables/themes'

interface TableData {
  date:string
  user: string
  type: string
  text: string
  version: string
  reference: string
}


interface Error {
  type: 'delete_failed',
  message: string
}


const ApprovalDetailList = ({ assessments, loading=false }: {  assessments?:ToString<Partial<approvalFormParams>>[], loading?:boolean }) => {


  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Date',
        selector: (row: TableData) => row.date!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Type',
        selector: (row: TableData) => row.type!,
        sortable: true,
        wrap: true
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
        data={assessments?.map(dataObj => {
          return {
            date: dataObj.approvalDate || '-',
            user: dataObj.artifactCommentUser || "-",
            type: dataObj.artifactCommentType || "",
            text: dataObj.artifactCommentText || "-",
            reference: dataObj.artifactCommentReference || "-",
            version: dataObj.artifactCommentTarget?.split('|')?.pop() || "-"
          }
        }) || []}
        pagination
        paginationPerPage={10}
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

export { ApprovalDetailList }