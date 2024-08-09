import React from 'react'
import { PageTitle } from '@/components/Typography'
import { ApproveForm } from '@/components/ApproveForm'
import { Row } from '@/components/ApproveForm/styles'
import type { LibraryServerSideProps } from '@/utils/getLibraryServerSideProp'
export { default as getServerSideProps } from '@/utils/getLibraryServerSideProp'

const Approve = ({ program }: LibraryServerSideProps) => {
  return (
    <>
      <Row>
        <PageTitle style={{ marginBottom: '2rem' }}>Approve</PageTitle>
      </Row>
      <ApproveForm program={program} />
    </>
  )
}

export default Approve
