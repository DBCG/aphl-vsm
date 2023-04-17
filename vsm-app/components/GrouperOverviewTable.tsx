import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ValueSet } from 'fhir/r4'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import { GrouperItem } from '@/types/grouperTypes'
import { useGetGroups } from '@/hooks/useGetGroups'

interface TableData {
  name: ValueSet['name']
  title: ValueSet['title']
  url: ValueSet['url']
  version: ValueSet['version']
  id: ValueSet['id']
}

interface DeleteGrouper {
  grouperLibId: string | undefined
  grouperVsCanonicalToRemove: string | undefined
  grouperVsIdToRemove: string | undefined
}

interface Error {
  type: 'delete_failed' | 'missing_grouper_id'
  message: string
}

const ButtonContainer = styled.div`
  margin: 16px 0;
`

interface GrouperTable {
  data: GrouperItem[]
  toggleRefreshData: () => void
  grouperLibId: fhir4.Library['id']
  programStatus: fhir4.Library['status']
}

const GrouperOverviewTable = ({ grouperLibId, programStatus }: GrouperTable) => {
  const router = useRouter()
  const programId = router.query.id as string
  const [error, setError] = useState<null | Error>(null)
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const [deleting, setDeleting] = useState(false)
  const [toggleRefresh, setToggleRefresh] = useState(false)

  const grouperData = useGetGroups({ programId, refreshToggle: toggleRefresh })

  // can only delete grouper if has editing permissions
  // deleting the grouper removes it from the grouper library
  const deleteGrouper = useCallback(
    async ({ grouperLibId, grouperVsCanonicalToRemove, grouperVsIdToRemove }: DeleteGrouper) => {
      if (!grouperLibId) {
        setError({
          type: 'missing_grouper_id',
          message: 'Grouper Library is missing an ID'
        })
        return
      }
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
        setToggleRefresh((t) => !t)
      } else {
        setError({
          type: 'delete_failed',
          message: 'Failed to delete grouper Value Set'
        })
        setDeleting(false)
      }
    },
    [programId]
  )

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

  // whenever data coming from props changes, reset deleting state
  useEffect(() => {
    if (deleting) {
      setDeleting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouperData])

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Name',
        selector: (row: fhir4.ValueSet) => row.name!,
        sortable: true,
        wrap: true
      },
      {
        name: 'Title',
        selector: (row: fhir4.ValueSet) => row.title!,
        sortable: true,
        wrap: true
      },
      {
        name: 'URL',
        selector: (row: fhir4.ValueSet) => row.url!,
        wrap: true
      },
      {
        name: 'Version',
        selector: (row: fhir4.ValueSet) => row.version!,
        sortable: true,
        wrap: true,
        maxWidth: '150px'
      },
      {
        name: 'Remove Group',
        maxWidth: '150px',
        center: true,
        omit: !(can(session, 'edit') && programStatus === 'draft'),
        cell: (row: fhir4.ValueSet) => {
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
  }, [deleteGrouper, grouperLibId, programStatus, session])

  console.log('data: ', grouperData)

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
        onRowClicked={(row: fhir4.ValueSet) => {
          router.push(`/programs/${programId}/valuesets/${row.id}`)
        }}
        data={grouperData}
        pagination
        paginationPerPage={10}
      />
    </>
  )
}

export { GrouperOverviewTable }
