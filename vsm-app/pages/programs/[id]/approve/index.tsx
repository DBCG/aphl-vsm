import React from 'react'
import { PageTitle } from '@/components/Typography'
import type { NextPage } from 'next'
import { ApproveForm } from '@/components/ApproveForm'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'

import {
  Row
} from '@/components/ApproveForm/styles'
import { useRouter } from 'next/router'


const Approve: NextPage = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const { programAndGrouperData, programAndGrouperDataLoading } = useGetProgramDetails({ id: programId })
  if (programAndGrouperDataLoading || programAndGrouperData?.program == null) { return null }

  return (
    <>
      <Row>
        <PageTitle style={{ marginBottom: '2rem' }}>Approve</PageTitle>
      </Row>
      <ApproveForm programAndGrouperData={programAndGrouperData}/>
    </>
  )
}

export default Approve
