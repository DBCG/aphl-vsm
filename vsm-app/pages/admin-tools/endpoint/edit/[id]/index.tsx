import type { NextPage } from 'next'
import { TerminologyServerForm } from '@/components/TerminologyServerForm'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import LoadingIndicator from '../../../../../components/LoadingIndicator'

const EditEndpointPage: NextPage = () => {
  const router = useRouter()
  const endpointId = router.query.id
  const [loading, setLoading] = useState(true)
  const [endpoint, setEndpoint] = useState<fhir4.Endpoint>()
  useEffect(() => {
    const url = `/api/endpoint/${endpointId}`
    fetch(url)
      .then((res) => res.json())
      .then((res) => setEndpoint(res))
  }, [endpointId])
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
