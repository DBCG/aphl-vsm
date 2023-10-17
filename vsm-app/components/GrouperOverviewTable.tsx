import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'
import DataTable from 'react-data-table-component'
import { can, VSMSession } from '@/helpers/rolesHelper'
import { IconButton } from './buttons/IconButton'
import LoadingIndicator from './LoadingIndicator'
import { DeleteGrouper } from '@/types/grouperTypes'
import { useGetGroups } from '@/hooks/useGetGroups'
import { customTableStyles } from './tables/themes'

interface Error {
  type: 'delete_failed' | 'missing_grouper_id' | 'server_failure'
  message: string
}

const ButtonContainer = styled.div`
  margin: 16px 0;
`

interface GrouperTable {
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

  const { groups, groupsError, groupsLoading } = useGetGroups({ programId, refreshToggle: toggleRefresh })

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
        setError({
          type: 'server_failure',
          message: `Error attempting to delete grouper with ID ${grouperLibId}`
        })
      }

      if (updated?.ok) {
        setToggleRefresh((t) => !t)
      } else {
        setError({
          type: 'delete_failed',
          message: 'Failed to delete grouper Value Set'
        })
      }
      setDeleting(false)
    },
    [programId]
  )

  useEffect(() => {
    const err = error?.message || groupsError
    if (err) {
      toast.error(err)
    } else {
      toast.dismiss()
    }
  }, [error, groupsError])

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
  }, [groups])

  const columns = useMemo(() => {
    const fields = [
      {
        name: 'Title',
        selector: (row: fhir4.ValueSet) => row.title!,
        sortable: true,
        wrap: true,
        minWidth: '20rem'
      },
      {
        name: 'Version',
        selector: (row: fhir4.ValueSet) => row.version!,
        sortable: true,
        wrap: true,
        maxWidth: '8rem'
      },
      {
        name: 'URL',
        selector: (row: fhir4.ValueSet) => row.url!,
        wrap: true
      },
      {
        name: 'Remove Group',
        maxWidth: '10rem',
        center: true,
        omit: !(can(session, 'edit') && programStatus === 'draft'),
        cell: (row: fhir4.ValueSet) => {
          return (
            <ButtonContainer>
              <IconButton
                deletedItemDescription={`grouper "${row.title}" from Program ${programId}`}
                onClick={async () => {
                  await deleteGrouper({
                    grouperLibId,
                    grouperVsCanonicalToRemove: row?.url,
                    grouperVsIdToRemove: row?.id
                  })
                }}
                buttoncontext="delete"
                style={{ backgroundColor: 'darkRed', margin: '0 auto' }}
              />
            </ButtonContainer>
          )
        }
      }
    ]

    return fields
  }, [deleteGrouper, grouperLibId, programStatus, session])

  return (
    <div id="grouper-overview-table">
      <DataTable
        progressPending={deleting || groupsLoading}
        progressComponent={<LoadingIndicator />}
        columns={columns}
        customStyles={customTableStyles('clickable')}
        highlightOnHover={true}
        onRowClicked={(row: fhir4.ValueSet) => {
          router.push(`/programs/${programId}/valuesets/${row.id}`)
        }}
        data={groups || []}
        pagination
        paginationPerPage={10}
        theme="aphl"
      />
    </div>
  )
}

export { GrouperOverviewTable }
