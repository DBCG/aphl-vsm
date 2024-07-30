import type { NextPage } from 'next'
import { TerminologyServerForm } from '@/components/TerminologyServerForm'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import LoadingIndicator from '@/components/LoadingIndicator'
import { ErrorMessage } from '@/components/ErrorMessage'

const EditEndpointPage: NextPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  // error states
  const [error, setError] = useState<null | string>(null)
  const [endpoint, setEndpoint] = useState<fhir4.Endpoint>()
  useEffect(() => {
    if (router.query.id) {
      const url = `/api/endpoint/${router.query.id}`
      fetch(url)
        .then((res) => res.json())
        .then((res: fhir4.Endpoint | { error: string }) => {
          if ('error' in res) {
            throw res.error
          } else {
            setEndpoint(res)
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Error loading endpoint')
        })
    }
  }, [router.query.id])
  useEffect(() => {
    if (endpoint) {
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [endpoint])
  if (error) {
    return <ErrorMessage error={error} />
  } else {
    return loading ? <LoadingIndicator /> : <TerminologyServerForm endpoint={endpoint!} />
  }
}

export default EditEndpointPage
