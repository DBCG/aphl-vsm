import type { NextPage } from 'next'
import { TerminologyServerForm } from '@/components/TerminologyServerForm'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import LoadingIndicator from '../../../../components/LoadingIndicator'

const EditEndpointPage: NextPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [endpoint, setEndpoint] = useState<fhir4.Endpoint>()
  useEffect(() => {
    if (router.query.id) {
      const url = `/api/endpoint/${router.query.id}`
      fetch(url)
        .then((res) => res.json())
        .then((res) => setEndpoint(res))
    }
  }, [router.query.id])
  useEffect(() => {
    if (endpoint) {
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [endpoint])
  return loading ? <LoadingIndicator /> : <TerminologyServerForm endpoint={endpoint!} />
}

export default EditEndpointPage
