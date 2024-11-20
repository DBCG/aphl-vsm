import { fetcher } from '@/utils'
import { Box, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Row } from '@/styles'
import { toast } from 'react-toastify'
import { IconButton } from '@/components/buttons/IconButton'
import { PageTitle } from '@/components/Typography'
import { useRouter } from 'next/router'
import { TerminologyServerCredentials } from '@/backend/model/TerminologyServerCredential'

type CredentialsSnippetProps = {
  shouldDisplay: boolean
  isEditing: boolean
  username: string
  password: string
  cancelEdit: () => void
  onUpdate: (username: string, password: string) => void
}

type EndpointDetails = { id: string; name: string; address: string }

const CredentialsSnippet = ({ shouldDisplay, isEditing, cancelEdit, onUpdate, username, password }: CredentialsSnippetProps) => {
  const [newUsername, setNewUsername] = useState(username)
  const [newPassword, setNewPassword] = useState(password)

  if (isEditing) {
    return (
      <Box sx={{ mt: 2 }}>
        <TextField onChange={(e) => setNewUsername(e.target.value)} value={newUsername} label="Username" />
        <TextField type="password" onChange={(e) => setNewPassword(e.target.value)} sx={{ ml: 1 }} value={newPassword} label="Password" />
        <Box sx={{ mt: 1 }}>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                await onUpdate(newUsername, newPassword)
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
        {shouldDisplay ? (
          <>
            <Typography>{`Username: ${username}`}</Typography>
            <Typography sx={{ ml: 1 }}>{`Password: ${password}`}</Typography>
          </>
        ) : (
          <>
            <Typography>{'Username: ●●●●●●●●●●●●●●●●●'}</Typography>
            <Typography sx={{ ml: 1 }}>{'Password: ●●●●●●●●●●●●●●●●●'}</Typography>
          </>
        )}
      </Box>
    )
  }
}

const AddEndpointForm = ({ availableEndpoints = [], closeForm }: any) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState('')
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
    <Box sx={{ m: '1rem 0 0.5rem 0', borderRadius: '1rem', backgroundColor: 'white', p: '1rem' }}>
      <FormControl sx={{ m: '1rem' }}>
        <InputLabel sx={{ backgroundColor: 'white' }} id="available-endpoints-label">
          Available Endpoints
        </InputLabel>
        <Select
          labelId="available-endpoints-label"
          onChange={(e: SelectChangeEvent) => {
            setSelectedEndpoint(e.target.value)
          }}
        >
          {availableEndpoints.map((e: any) => (
            <MenuItem key={e.id} value={e.id}>
              {e.name}
            </MenuItem>
          ))}
        </Select>
        {selectedEndpoint.length > 0 && (
          <Box>
            <Typography sx={{ mr: '0.5rem', fontWeight: 'bold' }}>Selected Endpoint Url:</Typography>
            <Typography>{availableEndpoints.find((i: fhir4.Endpoint) => i?.id === selectedEndpoint)?.address}</Typography>
          </Box>
        )}
        <Box sx={{ mt: '2rem', mb: '2rem' }}>
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
            onClick={() => submitNewCredentials(selectedEndpoint, username, password)}
            sx={{ ml: '1rem' }}
            disabled={!username.length || !password.length || !selectedEndpoint.length}
          >
            Add Endpoint
          </Button>
        </Box>
      </FormControl>
    </Box>
  )
}

const SettingsPage = () => {
  const router = useRouter()
  const [showCredentialSet, setShowCredentialSet] = useState(new Set())
  const [showEditSet, setShowEditSet] = useState(new Set())

  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_TERMINOLOGY_ENDPOINT !== 'true') {
      router.push('/')
    }
  }, [router])
  
  const {
    data: currentCredentials = null,
    isLoading: credsLoading,
    mutate: reloadCurrentCredentials
  } = useSWR('/api/settings/terminology-source', fetcher) as {
    data: TerminologyServerCredentials[]
    isLoading: boolean
    mutate: () => void
  }
  const { data: currentEndpoints = null, isLoading: endpointsLoading, mutate: reloadCurrentEndpoints } = useSWR('/api/endpoint', fetcher)


  if (credsLoading || endpointsLoading) {
    return <LoadingIndicator />
  }

  const refetchData = () => {
    reloadCurrentCredentials()
    reloadCurrentEndpoints()
  }

  const availableEndpoints = [] as EndpointDetails[]
  const credentials = [] as ({ username: string; password: string; } & EndpointDetails)[]

  currentEndpoints?.endpoints?.forEach((endpoint: fhir4.Endpoint) => {
    const foundCred = currentCredentials?.find((cred) => cred.terminologyServerId === endpoint.id)
    const baseEndpoint = {
      id: endpoint.id,
      name: endpoint.name,
      address: endpoint.address
    } as EndpointDetails
    if (foundCred) {
      credentials.push({
        ...baseEndpoint,
        username: foundCred.username,
        password: foundCred.password
      })
    } else {
      availableEndpoints.push(baseEndpoint)
    }
  })

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

  return (
    <Box>
      <Row>
        <PageTitle>Settings</PageTitle>
        {<Button onClick={() => setIsAdding(true)}>Add Credentials</Button>}
      </Row>
      <Typography sx={{ mt: 2 }} variant="h5">
        Endpoint Credential Management
      </Typography>
      {!isAdding && !currentCredentials?.length && (
        <Typography variant={'h5'} sx={{ mt: '3rem' }}>
          No credentials found, Click &quot;Add Credentials&quot; to get started
        </Typography>
      )}
      {isAdding && (
        <AddEndpointForm
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
                  m: '1rem 0 0.5rem 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  width: '80%',
                  p: '1rem'
                }}
              >
                <Stack>
                  <Typography>{`Name: ${e?.name || 'No name'}`}</Typography>
                  <Typography>{`URL: ${e?.address || 'No Url'}`}</Typography>
                  <Box>
                    <CredentialsSnippet
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
                      sx={{ visibility: showEditSet.has(e.id) ? 'hidden' : 'visible' }}
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
                <Box sx={{ display: 'flex' }}>
                  <IconButton
                    buttoncontext="edit"
                    onClick={() => {
                      showEditSet.add(e.id)
                      setShowEditSet(new Set(showEditSet))
                    }}
                  />
                  <IconButton
                    style={{ marginLeft: '1rem' }}
                    buttoncontext="delete"
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

export default SettingsPage
