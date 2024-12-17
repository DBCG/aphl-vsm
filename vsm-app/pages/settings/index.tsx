import type { NextPage } from 'next'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import DT, { TableColumn } from 'react-data-table-component'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import LoadingIndicator from '@/components/LoadingIndicator'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { formatDateForTable } from '@/helpers/formatDates'
import { ErrorMessage } from '@/components/ErrorMessage'
import { EndpointResponse } from '../api/endpoint'
import { PaginationState } from '@/components/Provisional/ProgramsTab'
import { useRouter } from 'next/router'
import { getAuthenticationTypeString } from '@/components/TerminologyServerForm'
import { fetcher } from '@/utils'
import { Box, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack, TextField, Typography, Tooltip } from '@mui/material'
import useSWR from 'swr'
import { Row as RowStyle } from '@/styles'
import { toast } from 'react-toastify'
import { TerminologyServerCredentials } from '@/backend/model/TerminologyServerCredential'
import { useSession } from 'next-auth/react'
import { VSMSession } from '@/helpers/rolesHelper'
import { useTestTermEndpoint } from '@/hooks/useTestTermEndpoint'

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

// COMPONENTS
type CredentialsSnippetProps = {
  shouldDisplay: boolean
  isEditing: boolean
  username: string
  password: string
  reload: () => void
  cancelEdit: () => void
  onUpdate: (username: string, password: string) => void
}

type EndpointDetails = { id: string; name: string; address: string }

const CredentialsSnippet = ({ shouldDisplay, isEditing, cancelEdit, onUpdate, username, password, reload }: CredentialsSnippetProps) => {
  const [newUsername, setNewUsername] = useState(username)
  const [newPassword, setNewPassword] = useState(password)

  if (isEditing) {
    return (
      <Box sx={{ mt: 2 }}>
        <TextField onChange={(e) => setNewUsername(e.target.value)} value={newUsername} label="Username" />
        <TextField onChange={(e) => setNewPassword(e.target.value)} sx={{ ml: 1 }} value={newPassword} label="Password" />
        <Box sx={{ mt: 1 }}>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                await onUpdate(newUsername, newPassword)
                await reload()
                cancelEdit()
              } catch (e) {
                // Catch here to prevent the cancelEdit from being called
              }
            }}
            sx={{ ml: 1 }}
          >
            Save
          </Button>
        </Box>
      </Box>
    )
  } else {
    return (
      <Box>
        <>
          <Typography>
            <b>Username:</b>
            {` ${shouldDisplay ? username: '●●●●●●●●●●●●●●●●●'}`}
          </Typography>
          <br/>
          <Typography>
            <b>Password:</b>
            {` ${shouldDisplay ? password : '●●●●●●●●●●●●●●●●●'}`}
          </Typography>
        </>
      </Box>
    )
  }
}

const AddEndpointForm = ({ availableEndpoints = [], closeForm }: any) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(availableEndpoints[0]?.id)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const submitNewCredentials = async (serverId: string, username: string, password: string) => {
    try {
      const result = await fetch(`/api/settings/terminology-source`, {
        method: 'POST',
        body: JSON.stringify({
          terminologyServerId: serverId,
          username,
          password
        })
      })

      if (!result.ok) {
        toast.error('Error adding credentials')
        console.error(result.body)
        return
      }

      toast.success('Credentials added successfully')
      closeForm()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Box sx={{ borderRadius: '1rem', p: '1rem' }}>
      <FormControl>
        <Box sx={{ mb: '2rem' }}>
          <TextField
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            id="add-endpoint-name"
            label="Username"
            style={{ marginRight: '1rem', width: '48%' }}
          />
          <TextField
            id="add-endpoint-password"
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
            type="password"
            style={{ width: '48%' }}
          />
        </Box>
        <Box>
          <Button onClick={() => closeForm()}> Cancel </Button>
          <Button
            onClick={() => submitNewCredentials(availableEndpoints[0]?.id, username, password)}
            sx={{ ml: '1rem' }}
            disabled={!username.length || !password.length || !availableEndpoints?.[0]?.id}
          >
            Update Credentials
          </Button>
        </Box>
      </FormControl>
    </Box>
  )
}

const ValidStatus = ({ isValid, isLoading }: { isValid: boolean, isLoading: boolean }) => {
  if (isLoading) return (
    <p>Validating endpoint...</p>
  )
  const inner = isValid ? (
    <>
      <Typography style={{ color: 'inherit' }}>Creds Valid</Typography>
      <CheckCircleOutlineIcon style={{ color: 'inherit', marginLeft: '.2rem', marginBottom: '.1rem' }} />
    </>
  ) : (
    <>
      <Typography style={{ color: 'inherit' }}>Creds Invalid</Typography>
      <ErrorOutlineIcon style={{ color: 'inherit', marginLeft: '.2rem', marginBottom: '.1rem' }} />
    </>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', color: isValid ? 'var(--theme-400)' : 'var(--accent)' }}>
      {inner}
    </div>
  )
}

const CredentialsItem = (currentServerData: any) => {
  const [showCredentialSet, setShowCredentialSet] = useState(new Set())
  const [showEditSet, setShowEditSet] = useState(new Set())
  const {data, currentCredentials, credsLoading, reloadCurrentCredentials, setVsacInvalid} = currentServerData
  const [isAdding, setIsAdding] = useState(false)
  
  const { data: currentEndpoints = null, isLoading: endpointsLoading, mutate: reloadCurrentEndpoints } = useSWR('/api/endpoint', fetcher)

  const refetchData = () => {
    reloadCurrentCredentials()
    reloadCurrentEndpoints()
  }

  const [availableEndpoints, credentials] = useMemo(() => {
    const availEnd = [] as EndpointDetails[]
    const creds = [] as ({ username: string; password: string; } & EndpointDetails)[]
    currentEndpoints?.endpoints
    ?.filter((e: any) => e?.id === data?.id)
    ?.forEach((endpoint: fhir4.Endpoint) => {
      const foundCred = currentCredentials?.find((cred: any) => cred.terminologyServerId === endpoint.id)
      const baseEndpoint = {
        id: endpoint.id,
        name: endpoint.name,
        address: endpoint.address
      } as EndpointDetails
      if (foundCred) {
        creds.push({
          ...baseEndpoint,
          username: foundCred.username,
          password: foundCred.password
        })
      } else {
        availEnd.push(baseEndpoint)
      }
    })
    return [availEnd, creds]
  }, [currentCredentials, currentEndpoints])

    const {
    isEndpointValid,
    pingLoading,
    pingError,
    pingMutate
  } = useTestTermEndpoint({
    endpointUrl: credentials?.[0]?.address || '',
    endpointName: credentials?.[0]?.name,
    username: credentials?.[0]?.username,
    password: credentials?.[0]?.password,
  })

  useEffect(() => {
    if (credentials?.[0]?.id === 'vsac' && !isEndpointValid && !pingLoading && pingError) {
      setVsacInvalid(true)
    } else {
      setVsacInvalid(false)
    }
  }, [isEndpointValid, pingLoading])

  const updateCredential = async (id: string, username: string, password: string) => {
    try {
      const result = await fetch(`/api/settings/terminology-source`, {
        method: 'PUT',
        body: JSON.stringify({
          terminologyServerId: id,
          username,
          password
        })
      })

      if (result.ok) {
        toast.success('Credential updated successfully')
        await reloadCurrentCredentials()
        return
      } else {
        const json = await result.json()
        console.error(json)
        toast.error('Error updating credential')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error updating credential')
    }
    throw new Error('Error updating credential')
  }

  const deleteCredential = async (id: string) => {
    try {
      const result = await fetch(`/api/settings/terminology-source`, {
        method: 'DELETE',
        body: JSON.stringify({
          serverId: id
        })
      })

      if (result.ok) {
        toast.success('Credential deleted successfully')
      } else {
        const json = await result.json()
        console.error(json)
        toast.error(json.message)
      }
    } catch (e) {
      console.error(e)
      toast.error('Error deleting credential')
    }
  }

  const isOdd = data?.index % 2 === 0

  if (credsLoading || endpointsLoading) {
    return <LoadingIndicator />
  }

  const reload = async () => {
    reloadCurrentCredentials()
    reloadCurrentEndpoints()
  }

  return (
    <Box style={{ backgroundColor: isOdd ? 'var(--neutral-350)' : 'var(--neutral-300)'}}>
      { !credentials?.length ?
        <RowStyle style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
          {<Button onClick={() => setIsAdding(true)}>&#43; Add Credentials</Button>}
        </RowStyle>
        : null
      }
      {!isAdding && !currentCredentials?.length && (
        <div style={{ paddingBottom: '1rem' }}>
          <Typography sx={{ mt: '3rem', p: '2rem', color: 'gray' }}>
            No credentials found, Click &quot;Add Credentials&quot; to get started
          </Typography>
        </div>
      )}
      {isAdding && (
        <AddEndpointForm
          isOdd={isOdd}
          availableEndpoints={availableEndpoints}
          closeForm={() => {
            refetchData()
            setIsAdding(false)
          }}
        />
      )}
      {credentials.length > 0 &&
        credentials.map((e) => {
          if (e?.username && e?.password) {
            return (
              <Box
                key={e?.id}
                sx={{
                  p: '1rem 0 0.5rem 1rem',
                  display: 'flex',
                  // justifyContent: 'space-between',
                  borderRadius: '1rem',
                  width: '80%',
                }}
              >
                <Stack>
                  <ValidStatus isValid={isEndpointValid} isLoading={pingLoading} />
                  <Box>
                    <CredentialsSnippet
                      reload={reload}
                      isEditing={showEditSet.has(e.id)}
                      onUpdate={(newUsername, newPassword) => updateCredential(e.id!, newUsername, newPassword)}
                      cancelEdit={() => {
                        showEditSet.delete(e.id)
                        setShowEditSet(new Set(showEditSet))
                      }}
                      shouldDisplay={showCredentialSet.has(e.id)}
                      username={e.username}
                      password={e.password}
                    />
                    <Button
                      sx={{ mb: '1rem', visibility: showEditSet.has(e.id) ? 'hidden' : 'visible' }}
                      onClick={() => {
                        if (showCredentialSet.has(e.id)) {
                          showCredentialSet.delete(e.id)
                        } else {
                          showCredentialSet.add(e.id)
                        }
                        setShowCredentialSet(new Set(showCredentialSet))
                      }}
                    >
                      {showCredentialSet.has(e.id) ? 'Hide' : 'Show'} credentials
                    </Button>
                  </Box>
                </Stack>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', marginLeft: '2rem' }}>
                  <Button
                    disabled={showEditSet.has(e.id)}
                    onClick={() => {
                      showEditSet.add(e.id)
                      setShowEditSet(new Set(showEditSet))
                    }}
                  >
                    Edit
                  </Button>
                  <IconButton
                    // style={{ marginLeft: '1rem' }}
                    buttoncontext="delete"
                    style={{
                      backgroundColor: 'var(--accent)',
                    }}
                    deletedItemDescription={`Are you sure you want to delete credential's for ${e.name}`}
                    onClick={async () => {
                      await deleteCredential(e.id!)
                      refetchData()
                    }}
                  />
                </Box>
              </Box>
            )
          }
          return null
        })}
    </Box>
  )
}

// PAGE
const TerminologyEndpoints: NextPage = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<fhir4.Endpoint[]>([])
  const [error, setError] = useState({ error: '' })
  const router = useRouter()
  const { data: session } = useSession() as unknown as { data: VSMSession }
  const isAdmin = session?.user?.roles?.includes('admin')
  const [vsacInvalid, setVsacInvalid] = useState(false)

  const {
    data: currentCredentials = null,
    isLoading: credsLoading,
    mutate: reloadCurrentCredentials
  } = useSWR('/api/settings/terminology-source', fetcher) as {
    data: TerminologyServerCredentials[]
    isLoading: boolean
    mutate: () => void
  }

  // Table Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    countPerPage: 10,
    searchTotal: 0
  })

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_TERMINOLOGY_ENDPOINT !== 'true') {
      router.push('/')
    }
  }, [router])

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
        omit: !isAdmin,
        selector: (row: fhir4.Endpoint) => row.name || '',
        sortable: false,
        wrap: true,
        center: true,
        maxWidth: '3rem',
        minWidth: '10rem',
        cell: (row: fhir4.Endpoint) => {
          if (row.id === 'vsac') {
            return 'VSAC endpoint details readonly'
          }
          return (
            <ButtonWrapper style={{ minWidth: '9rem', justifyContent: 'space-around' }}>
              <IconButton
                onClick={() => {
                  router.push(`/admin/edit-endpoint/${row.id}`)
                }}
                buttoncontext={'edit'}
              />
              <Tooltip
                placement="top" arrow
                title={row?.id === 'vsac' ? 'Cannot delete VSAC endpoint' : 'Delete endpoint'}
              >
                <span>
                  <IconButton
                    disabled={row?.id === 'vsac'}
                    title='test'
                    onClick={() => {
                      const url = `/api/endpoint/${row.id}`
                      setLoading(true)
                      return fetch(url, { method: 'DELETE' })
                        .catch((error) => setError({ error: error.error || error.toString() }))
                        .finally(() => {
                          setLoading(false)
                          fetchEndpoints((pagination.page - 1) * pagination.countPerPage, pagination.page * pagination.countPerPage)
                        })
                    }}
                    buttoncontext="delete"
                  />
                </span>
              </Tooltip>
            </ButtonWrapper>
          )
        }
      }
    ],
    [pagination.countPerPage, pagination.page, router]
  )

  const onboardingText = {
    title: 'Welcome to the Valueset Manager!',
    body: 'In order to view content, you must first add valid credentials for the VSAC server below.',
    requirements: 'This is required for the app to be able to run.'
  }

  return (
    <Col>
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>Settings</PageTitle>
      </Row>
      <Box style={{ backgroundColor: 'white', padding: '1rem', marginBottom: '1rem' }}>
        <p style={{ fontWeight: 'bold' }}>{onboardingText.title}</p>
        <p>{onboardingText.body}</p>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon style={{ color: 'var(--warning-medium)', marginRight: '.2rem', marginBottom: '.1rem' }}/>
          <span>{onboardingText.requirements}</span>
        </div>
      </Box>
      {isAdmin && (
        <Row style={{ alignItems: 'center' }}>
          <h4 style={{ color: 'var(--theme-400)'}}>Terminology Endpoints</h4>
          <Button onClick={() => router.push('/settings/create-endpoint')}>Add New Terminology Endpoint</Button>
        </Row>
      )}
      <ErrorMessage error={error?.error || null} />
      <DT
        data={
          data?.map((d, index) => ({ ...d, index }))
        }
        expandableRows
        expandableRowExpanded={() => true}
        expandableRowsComponent={CredentialsItem}
        expandableRowsComponentProps={{ currentCredentials, credsLoading, reloadCurrentCredentials, setVsacInvalid }}
        conditionalRowStyles={[
          {
            when: (row) => data.findIndex((r) => r.id === row.id) % 2 !== 0,
            style: { backgroundColor: 'var(--neutral-300)'}
          },
          {
            when: (row) => data.findIndex((r) => r.id === row.id) % 2 === 0,
            style: { backgroundColor: 'var(--neutral-350)'}
          }
        ]}
        columns={columns}
        theme="aphl"
        striped={true}
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
