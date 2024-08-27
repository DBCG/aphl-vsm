import { ErrorMessage } from '@/components/ErrorMessage'
import { fetcher } from '@/utils'
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Row } from '@/styles'

const CredentialsSnippet = ({ shouldDisplay, username, password }: { shouldDisplay: boolean; username: string; password: string }) => {
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

const AddEndpointForm = ({ availableEndpoints, closeForm }: any) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <Box sx={{ m: '1rem 0 0.5rem 0', borderRadius: '1rem', backgroundColor: 'white', p: '1rem' }}>
      <FormControl sx={{m: '1rem'}}>
        <InputLabel sx={{ backgroundColor: 'white' }} id="available-endpoints-label">
          Available Endpoints
        </InputLabel>
        <Select
          labelId="available-endpoints-label"
          onChange={(e) => {
            console.log(e)
          }}
        >
          {availableEndpoints.map((e: any) => (
            <MenuItem key={e.id} value={e.id}>
              {e.name}
            </MenuItem>
          ))}
        </Select>
        <Box sx={{mt: '2rem', mb: '2rem'}}>
          <TextField
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            id="add-endpoint-name"
            label="Username"
            style={{ marginRight: '1rem' }}
          />
          <TextField id="add-endpoint-password" label="Password" type="password" style={{ marginRight: '1rem' }} />
        </Box>
        <Box>
          <Button onClick={() => closeForm()}>
            {' '}
            Cancel{' '}
          </Button>
          <Button sx={{ml: '1rem'}} disabled={!username.length}>Add Endpoint</Button>
        </Box>
      </FormControl>
    </Box>
  )
}

const SettingsPage = () => {
  // new credentials to add
  const [serverIdToAdd, setServerIdToAdd] = useState(null)
  const [userToAdd, setUserToAdd] = useState(null)
  const [pwToAdd, setPwToAdd] = useState(null)
  const [showCredentialSet, setShowCredentialSet] = useState(new Set())
  const [newCredentialError, setNewCredentialError] = useState(null)
  const { data: currentCredentials = null, isLoading: credsLoading } = useSWR('/api/tscredentials', fetcher)
  const { data: currentEndpoints = null, isLoading: endpointsLoading } = useSWR('/api/endpoint', fetcher)
  const [isAdding, setIsAdding] = useState(false)
  if (currentCredentials == null && currentEndpoints == null) {
    return <LoadingIndicator />
  }

  const clearAllCredentialsToAdd = () => {
    setServerIdToAdd(null)
    setUserToAdd(null)
    setPwToAdd(null)
    setNewCredentialError(null)
  }

  const submitNewCredential = async () => {
    try {
      const result = await fetch(`/api/tscredentials`, {
        method: 'POST',
        body: JSON.stringify({
          terminologyServerId: serverIdToAdd,
          username: userToAdd,
          password: pwToAdd
        })
      })

      if (result.ok) {
        clearAllCredentialsToAdd()
        console.log('result is ok')
      } else {
        const json = await result.json()
        setNewCredentialError(json)
      }
      console.log('result: ', result)
    } catch (e) {
      console.error(e)
    }
  }

  // TOOD: add types
  const availableEndpoints = [] as any
  const credentials = [] as any

  currentEndpoints?.endpoints?.forEach((endpoint: fhir4.Endpoint) => {
    const foundCred = currentCredentials.find((cred) => cred.terminologyServerId === endpoint.id)
    const baseEndpoint = {
      id: endpoint.id,
      name: endpoint.name,
      address: endpoint.address
    }
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

  return (
    <Box>
      <Row>
        <Typography variant="h5">Endpoint Credential Management</Typography>
        {<Button onClick={() => setIsAdding(true)}>Add Credentials</Button>}
      </Row>
      {isAdding && <AddEndpointForm availableEndpoints={availableEndpoints} closeForm={() => setIsAdding(false)} />}
      {credentials.length > 0 &&
        credentials.map((e) => {
          if (e?.username && e?.password) {
            return (
              <Box key={e?.id} sx={{ m: '1rem 0 0.5rem 0', borderRadius: '1rem', backgroundColor: 'white', p: '1rem' }}>
                <Stack>
                  <Typography>{`Name: ${e?.name || 'No name'}`}</Typography>
                  <Typography>{`URL: ${e?.address || 'No Url'}`}</Typography>

                  <Box>
                    <CredentialsSnippet shouldDisplay={showCredentialSet.has(e.id)} username={e.username} password={e.password} />
                    <Button
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
              </Box>
            )
          }
          return null
        })}

      <p>
        <b>POST new to /api/tscredentials:</b>
      </p>
      <ErrorMessage error={newCredentialError} />
      <Box gap={4} style={{ marginTop: '1rem' }}>
        <TextField
          id="add-term-server-id"
          label="Terminology Server ID"
          variant="standard"
          style={{ marginRight: '1rem' }}
          onChange={(e) => {
            console.log(e)
            setServerIdToAdd(e?.target?.value || null)
          }}
        />
        <TextField
          id="add-term-server-user"
          label="Username"
          variant="standard"
          style={{ marginRight: '1rem' }}
          onChange={(e) => {
            console.log(e)
            setUserToAdd(e?.target?.value || null)
          }}
        />
        <TextField
          id="add-term-server-pw"
          label="Password"
          variant="standard"
          onChange={(e) => {
            console.log(e)
            setPwToAdd(e?.target?.value || null)
          }}
        />
      </Box>
      <Box>
        <Button onClick={submitNewCredential} style={{ marginTop: '1rem' }}>
          Add to credentials
        </Button>
      </Box>
    </Box>
  )
}

export default SettingsPage
