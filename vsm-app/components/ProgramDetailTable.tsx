import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ValueSet } from 'fhir/r4'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'

interface TableData {
  name: ValueSet['name']
  title: ValueSet['title']
  url: ValueSet['url']
  version: ValueSet['version']
  id: ValueSet['id']
}

interface DeleteGrouper {
  grouperLibId: string
  grouperVsCanonicalToRemove: string | undefined
  grouperVsIdToRemove: string | undefined
}

interface Error {
  type: 'delete_failed'
  message: string
}

const ButtonContainer = styled.div`
  margin: 16px 0;
`

const ProgramDetailTable = ({ data, grouperLibId, programStatus, toggleRefreshData }: any) => {
  const router = useRouter()
  const programId = router.query.id as string
  const [error, setError] = useState<null | Error>(null)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [deleting, setDeleting] = useState(false)

  // can only delete grouper if has editing permissions
  // deleting the grouper removes it from the grouper library
  const deleteGrouper = async ({ grouperLibId, grouperVsCanonicalToRemove, grouperVsIdToRemove }: DeleteGrouper) => {
    setDeleting(true)
    let endpoint = `/api/programs/${programId}/grouper/library`
    let updated
    try {
      const body = JSON.stringify({
        libraryId: grouperLibId,
        editingInfo: {
          action: 'remove',
          vsCanonical: grouperVsCanonicalToRemove,
          vsId: grouperVsIdToRemove
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
      toggleRefreshData()
    } else {
      setError({
        type: 'delete_failed',
        message: 'Failed to delete grouper Value Set'
      })
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message)
    } else {
      toast.dismiss()
    }
  }, [error])

  useEffect(() => {
    {
      can(session, 'edit') && status === 'draft'
    }
  })

  const columns = useMemo(() => {
    setDeleting(false)
    const fields = [
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
        omit: !(can(session, 'edit') && programStatus === 'draft'),
        cell: (row: TableData) => {
          return (
            <ButtonContainer>
              <IconButton
                onClick={async () => {
                  await deleteGrouper({
                    grouperLibId,
                    grouperVsCanonicalToRemove: row?.url,
                    grouperVsIdToRemove: row?.id
                  })
                }}
                buttonContext="delete"
                style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
              />
            </ButtonContainer>
          )
        }
      }
    ]

    return fields
  }, [data, grouperLibId])

  return (
    <>
      <DataTable
        progressPending={deleting}
        progressComponent={<LoadingIndicator />}
        columns={columns}
        customStyles={{
          rows: {
            style: {
              cursor: 'pointer'
            },
            highlightOnHoverStyle: {
              backgroundColor: '#DBF0F3'
            }
          }
        }}
        highlightOnHover={true}
        onRowClicked={(row: TableData) => {
          router.push(`/programs/${programId}/valuesets/${row.id}`)
        }}
        data={data}
        pagination
        paginationPerPage={10}
      />
    </>
  )
}

export { ProgramDetailTable }
