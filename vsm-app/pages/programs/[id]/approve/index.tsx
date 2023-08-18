import React from 'react'
import { PageTitle } from '@/components/Typography'
import type { NextPage } from 'next'
import { ApproveForm } from '@/components/ApproveForm'
import {
  Row
} from '../../../../components/ApproveForm/styles'


const Approve: NextPage = () => {
  return (
    <>
      <Row>
        <PageTitle style={{ marginBottom: '2rem' }}>Approve</PageTitle>
      </Row>
      <ApproveForm/>
    </>
  )
}

export default Approve
