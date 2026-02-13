import { useEffect, useMemo, useState } from 'react'
import type { GetServerSidePropsContext } from 'next'
import {
  Button,
  Snackbar,
  TextField,
  Box,
  Dialog,
  Stack,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { toast } from 'react-toastify'
import { getServerSession } from 'next-auth/next'
import { AuthOptions } from '@/pages/api/auth/[...nextauth]'
import useSWR from 'swr'
import { fetcher } from '@/utils'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {PageTitle} from "@/components/Typography";
import {Row} from "@/pages/settings";

interface GenerateKeyModalProps {
  open: boolean
  handleClose: () => void
}

const GenerateKeyModal = ({ open, handleClose }: GenerateKeyModalProps) => {
  const [apiKey, setApiKey] = useState<string>('')
  const [openSnackBar, setOpenSnackBar] = useState(false)

  useEffect(() => {
    if (open) {
      fetch('/api/apikey', {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((data) => {
          setApiKey(data.newSecret)
        })
    }
    return () => {
      setApiKey('')
    }
  }, [open])

  const handleClick = () => {
    setOpenSnackBar(true)
    navigator.clipboard.writeText(apiKey)
  }

  return (
    <Dialog
      fullWidth={true}
      maxWidth={'md'}
      open={open}
      onClose={() => {
        setApiKey('')
        handleClose()
      }}
      aria-labelledby='child-modal-title'
      aria-describedby='child-modal-description'
    >
      {!apiKey ? (
        <DialogTitle sx={{ textAlign: 'left' }}>Generating new API Key...</DialogTitle>
      ) : (
        <>
          <DialogTitle sx={{ textAlign: 'left' }}>New Api Key</DialogTitle>
          <DialogContent>
            <Box>
              <Stack direction='column' spacing={1} alignItems='center'>
                <Typography>
                  Please copy it and store it in a safe place. You will not be able to see it again.
                </Typography>
                <TextField
                  multiline
                  sx={{ width: '90%', padding: '0' }}
                  disabled={true}
                  hiddenLabel
                  defaultValue={apiKey}
                />
              </Stack>
            </Box>
          </DialogContent>

          <DialogActions sx={{ justifyContent: 'flex-end' }}>
            <Button variant='outlined' sx={{ color: 'white !important' }} onClick={handleClick}>
              Copy to clipboard
            </Button>
            <Snackbar
              open={openSnackBar}
              onClose={() => setOpenSnackBar(false)}
              autoHideDuration={2000}
              message='Copied to clipboard'
            />
            <Button sx={{ color: 'white !important' }} onClick={handleClose}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

const ApiKeyManagement = () => {
  const [openModal, setOpenModal] = useState(false)
  const [fhirBaseUrl, setFhirBaseUrl] = useState('')
  const [openSnackBar, setOpenSnackBar] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR('/api/apikey', fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  })

  useEffect(() => {
    (async () => {
      const base = await fetch('/api/fhirbasepath')
      if (base.ok) {
        const basePath = await base.json()
        setFhirBaseUrl(basePath.path)
      } else {
        setFhirBaseUrl('')
        toast.error('FHIR base path missing from configuration')
      }
    })()
  }, [])

  const handleCopyEndpoint = () => {
    if (fhirBaseUrl === '') {
      toast.error('FHIR base path missing from configuration')
      return
    }
    setOpenSnackBar(true)
    navigator.clipboard.writeText(fhirBaseUrl)
  }

  const role = useMemo(() => {
    return session?.user?.roles?.[0] || '' 
  }, [session])

  const maskedString = data?.maskedSecret ? 'x'.repeat(130) + data?.maskedSecret : 'Click Regenerate to get a new key'
  if (isLoading) return <div>Loading...</div>
  return (
    <Box>
      <GenerateKeyModal
        open={openModal}
        handleClose={() => {
          mutate()
          setOpenModal(false)
        }}
      />
      <Row style={{ alignItems: 'center', marginBottom: '1rem' }}>
        <PageTitle>API Key</PageTitle>
      </Row>
      <Box style={{ backgroundColor: 'white', padding: '1rem', marginBottom: '1rem' }}>
        <ul>
          <li>
            Your API Key is used to authenticate requests to the API.
          </li>
          <li>
            It is important to keep your API key secure.
          </li>
          <li>
            Treat your API key as you would any other password.
          </li>
        </ul>
      </Box>

      <Row style={{ alignItems: 'center' }}>
        <h4 style={{ color: 'var(--theme-400)'}}>Your Permissions</h4>
      </Row>
      <Box style={{ backgroundColor: 'white', padding: '1rem', marginBottom: '1rem' }}>
        <Typography>
          Your account is authorized as a{role === 'admin' ? 'n' : ''} <b>{role}.</b> You have unrestricted access to the FHIR Server.
        </Typography>
      </Box>

      <Row style={{ alignItems: 'center' }}>
        <h4 style={{ color: 'var(--theme-400)'}}>FHIR API Endpoint</h4>
      </Row>
      <Box style={{ backgroundColor: 'white', padding: '1rem', marginBottom: '1rem' }}>
        <Button
          variant='link'
          sx={{ backgroundColor: 'transparent', textTransform: 'lowercase', margin: '0', padding: '0' }}
          endIcon={<ContentCopyIcon />}
          onClick={handleCopyEndpoint}
        >
        {fhirBaseUrl}
        </Button>
      </Box>
      <Row style={{ alignItems: 'center' }}>
        <h4 style={{ color: 'var(--theme-400)'}}>Current API Key</h4>
      </Row>
      <Box sx={{ display: 'flex' }}>
        <TextField
          sx={{ width: '90%', padding: '0', backgroundColor: 'white' }}
          disabled={true}
          hiddenLabel
          value={maskedString}
          defaultValue={maskedString}
          multiline
        />
        <Button variant='outlined' sx={{ color: 'white' }} onClick={() => setOpenModal(true)}>
          Regenerate
        </Button>
      </Box>
      <Snackbar
        open={openSnackBar}
        onClose={() => setOpenSnackBar(false)}
        autoHideDuration={2000}
        message='Copied to clipboard'
      />
    </Box>
  )
}

export default ApiKeyManagement

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, AuthOptions)

  if (!session) {
    return { redirect: { destination: '/auth/signin' } }
  }

  return {
    props: {},
  }
}
