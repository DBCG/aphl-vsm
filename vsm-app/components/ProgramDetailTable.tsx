import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ValueSet } from 'fhir/r4'
import toast, { Toaster } from 'react-hot-toast'
import DataTable from 'react-data-table-component'
import { IconButton } from './buttons/IconButton'

interface TableData {
  name: ValueSet['name']
  title: ValueSet['title']
  url: ValueSet['url']
  version: ValueSet['version']
}

interface DeleteGrouper {
  grouperLibId: string,
  grouperVsCanonicalToRemove: string
}

interface Error {
  type: 'delete_failed',
  message: string
}

const ButtonContainer = styled.div`
  margin: 16px 0;
`

const ProgramDetailTable = ({ data, grouperLibId }: any) => {
  const router = useRouter()
  const programId = router.query.id as string
  const [error, setError] = useState<null | Error>(null)
  // can only delete grouper if has editing permissions
  // deleting the grouper removes it from the grouper library
  const deleteGrouper = async ({ grouperLibId, grouperVsCanonicalToRemove }: DeleteGrouper) => {
    let endpoint = `/api/programs/${programId}/grouper/library`
    let updated
    try {
      const body = JSON.stringify({
        libraryId: grouperLibId,
        editingInfo: {
          action: 'remove',
          vsCanonical: grouperVsCanonicalToRemove
        }
      })

      updated = await fetch(endpoint, {
        method: 'PUT',
        body
      })
    } catch (e) {
      console.error('error: ', e)
    }

    if (updated?.ok) {
      window.location.reload()
    } else {
      setError({
        type: 'delete_failed',
        message: 'Failed to delete grouper Value Set'
      })
    }
  }

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
  
  const columns = useMemo(() => [
  {
    name: 'Name',
    selector: (row: TableData) => row.name!,
    sortable: true,
    wrap: true
  },
  {
    name: 'Title',
    selector: (row: TableData) => row.title!,
    sortable: true,
    wrap: true
  },
  { 
    name: 'URL',
    selector: (row: TableData) => row.url!,
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
    name: 'Remove Group',
    maxWidth: '150px',
    center: true,
    cell: (row: TableData) => {
      return (
        <ButtonContainer>
          <IconButton
            onClick={async () => {
              await deleteGrouper({
                grouperLibId,
                grouperVsCanonicalToRemove: row.url
              })
            }}
            buttonContext='delete'
            style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
          />
        </ButtonContainer>
      )
    }
  }
  ], [data, grouperLibId])

  return (
    <>
      <Toaster/>
      <DataTable
        columns={columns}
        data={data}
        pagination
        paginationPerPage={10}
      />
    </>
  )
}

export { ProgramDetailTable }