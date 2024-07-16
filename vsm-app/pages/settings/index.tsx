import { ErrorMessage } from '@/components/ErrorMessage'
import { fetcher } from '@/utils'
import { Box, Button, TextField } from '@mui/material'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

const SettingsPage = () => {
  // new credentials to add
  const [serverIdToAdd, setServerIdToAdd] = useState(null)
  const [userToAdd, setUserToAdd] = useState(null)
  const [pwToAdd, setPwToAdd] = useState(null)
  const [newCredentialError, setNewCredentialError] = useState(null)
  // find term server by id
  const [serverIdToFind, setServerIdToFind] = useState(null)
  const [searchedCredentials, setSearchedCredentials] = useState(null)
  const [searchedCredentialsError, setSearchedCredentialsError] = useState(null)

  const {
    data: currentCredentials,
    isLoading,
    error
  } = useSWR(
    `/api/tscredentials`,
    fetcher,
    { revalidateOnFocus: true }
  )

  const clearAllCredentialsToAdd = () => {
    setServerIdToAdd(null)
    setUserToAdd(null)
    setPwToAdd(null)
    setNewCredentialError(null)
  }

  const credentialsMissing = useMemo(() => {
    const failingTests = [serverIdToAdd, userToAdd, pwToAdd].filter(item => {
      return (
        typeof item !== 'string' || item?.trim() === ''
      )
    })
    return Boolean(failingTests.length)
  }, [serverIdToAdd, userToAdd, pwToAdd])

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

  const findCredentialsByServerId = async () => {
    try {
      const result = await fetch(`/api/tscredentials/${serverIdToFind}`, {
        method: 'GET'
      })

      const json = await result.json()
      if (result.ok) {
        console.log('result is ok')
        setSearchedCredentials(json)
      } else {
        console.error('error encountered')
        console.log('json: ', json)
        setSearchedCredentialsError(json)
      }
      console.log('result: ', result)
    } catch (e) {
      console.error(e)
      setSearchedCredentialsError(e)
    }
  }


  return (
    <div>
      <p>
        <b>
          Results from GET /api/tscredentials (no id provided):
        </b>
      </p>
      {currentCredentials?.map(c => (
        <div style={{ marginBottom: '2rem', backgroundColor: 'white', padding: '1rem 2rem' }}>
          <p>{`Terminology server ID: ${c?.terminologyServerId || 'No term server'}`}</p>
          <p>{`Username: ${c?.username || 'No username'}`}</p>
          <p>{`Password: ${c?.password || 'No password'}`}</p>
        </div>
      ))}
      <p>
        <b>
          Results from GET /api/tscredentials/[ts-server-id]:
        </b>
      </p>
      <ErrorMessage error={searchedCredentialsError} />
        <TextField
          id="search-term-server-id"
          label="Server ID"
          variant="standard"
          style={{ marginRight: '1rem' }}
          onChange={(e) => {
            console.log(e)
            setServerIdToFind(e?.target?.value || null)
          }}
        />
      <Box>
        <Button disabled={!serverIdToFind || !serverIdToFind?.length} onClick={findCredentialsByServerId} style={{ margin: '1rem 0 2rem 0' }}>
          Find by server ID
        </Button>
      </Box>
      <p>
        <b>
          POST new to /api/tscredentials:
        </b>
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
        <Button disabled={credentialsMissing} onClick={submitNewCredential} style={{ marginTop: '1rem' }}>
          Add to credentials
        </Button>
      </Box>
    </div>
  )
}

export default SettingsPage