import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Typography } from '@mui/material'
import ValueSetContents from '@/components/ValueSetContents'

const ValueSetView = () => {
  const [valueSet, setValueSet] = useState<fhir4.ValueSet>()
  const router = useRouter()
  const { valuesetId } = router.query

  useEffect(() => {
    const fetchValueSet = async () => {
      const response = await fetch(`/api/valueset?id=${valuesetId}`)
      const valueSet = await response.json()
      setValueSet(valueSet)
    }
    fetchValueSet()
  }, [valuesetId])
  console.log(valueSet)
 return (
    <div>
      <Typography variant="h5">Program Version:</Typography>

      <ValueSetContents />
    </div>
 )
}

export default ValueSetView