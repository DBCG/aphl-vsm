import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { getSession, GetSessionParams, useSession } from 'next-auth/react'
import toast, { Toaster } from 'react-hot-toast'
import DataTable from 'react-data-table-component'
import LoadingIndicator from './LoadingIndicator'

interface TableData {
  user: string
  // type: 'documentation' | 'review' | 'guidance'
  text: string
  version: string
  reference: string
}

interface DeleteGrouper {
  grouperLibId: string,
  grouperVsCanonicalToRemove: string | undefined
  grouperVsIdToRemove: string | undefined
}

interface Error {
  type: 'delete_failed',
  message: string
}

const ButtonContainer = styled.div`
  margin: 16px 0;
`

const ApprovalDetailList = ({ data }: { data: fhir4.Library }) => {
  const [error, setError] = useState<null | Error>(null)

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message, {
        position: 'top-right',
        style: {
          borderRadius: 0
        }
      })
    } else {
      toast.dismiss()
    }
  }, [error])

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Endorser',
        selector: (row: TableData) => row.user!,
        sortable: true,
        wrap: true
      },
      // {
      //   name: 'Type',
      //   selector: (row: TableData) => row.type!,
      //   sortable: true,
      //   wrap: true
      // },
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
      <Toaster />
      <DataTable
        progressComponent={<LoadingIndicator />}
        columns={columns}
        data={data.extension?.filter(extension => extension.url.includes('artifactComment'))?.map(extension => {
          return {
            user: extension.extension?.find(extension => extension.url === 'user')?.valueString || "",
            // type: extension.extension?.find(extension => extension.url === 'type')?.valueString || "",
            text: extension.extension?.find(extension => extension.url === 'text')?.valueString || "",
            reference: extension.extension?.find(extension => extension.url === 'reference')?.valueString || "",
            version: extension.extension?.find(extension => extension.url === 'target')?.valueString?.split('|')?.[1] || ""
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