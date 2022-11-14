import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import DT from 'react-data-table-component'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { Button } from '@/components/buttons/Button'
import { LoadingModal } from '@/components/modals/LoadingModal'
import LoadingIndicator from '@/components/LoadingIndicator'
import { DataItem } from '@/hooks/useGetProgramValueSetDetails'

interface ErrorProp {
  error: string
}

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content;
`

const ErrorContainer = styled.div<ErrorProp>`
  max-height: ${props => props.error ? '500px' : '0'};
  background-color: white;
  transition: max-height 1s ease;
  padding-left: 18px;
  border: ${props => props.error ? '1px solid var(--accent)' : 'none'}; 

`

const ErrorText = styled.p<ErrorProp>`
  color: var(--accent);
  display: ${props => props.error ? 'inherit' : 'none'}
`

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Template = () => {

  const router = useRouter()
  let programId = router?.query?.id || ''
  const programDetails = useGetProgramValueSetDetails({ id: `${programId}` })
  const program = useGetPrograms({ id: `${programId}` })
  const [cloneLoading, setCloneLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [cloneError, setCloneError] = useState('')

  const cloneProgram = async () => {
    setCloneLoading(true)
    setCloneError('')
    let libraryData: any = ''
    libraryData = program[0]
    const json = JSON.stringify(libraryData)

    const res = await fetch('/api/template', {
      method: 'POST',
      body: json
    })

    if (res.ok) {
      router.push(`/programs`)
    } else {
      // if response is a failure, error message
      setCloneLoading(false)
      setModalOpen(false)
      setCloneError(`Error cloning program ${programId}`)
    }
  }

  const onClickClone = () => {
    cloneProgram()
  }

  const columns = useMemo(() => [
    {
      name: 'Value Set Name',
      selector: (row: DataItem) => row.valueSet.name,
      sortable: true,
      maxWidth: '350px',
      wrap: true
    },
    {
      name: 'Template Value Set Version',
      selector: (row: DataItem) => row.valueSet.version,
      sortable: true,
      maxWidth: '250px',
      wrap: true
    },
    {
      name: 'Edit Value Set Version',
      selector: (row: DataItem) => 'include a select here to get available versions?',
      sortable: true,
      maxWidth: '250px',
      wrap: true
    }
  ], [])

  {
    return (
      <Col>
        <LoadingModal
          actionType='clone'
          isOpen={modalOpen}
          handleModalAction={onClickClone}
          program={null}
          loading={cloneLoading}
          handleCancelModal={() => setModalOpen(false)}
        />
        <Row>
          <Button
            style={{ marginLeft: '800px', marginBottom: '12px', width: '240px', lineHeight: '130%' }}
            text='Clone Program as Template'
            onClick={(() => setModalOpen(true))}
          />
        </Row>
        <ErrorContainer error={cloneError}>
          <ErrorText error={cloneError}>{ cloneError }</ErrorText>
        </ErrorContainer>
        <DT
          // @ts-expect-error
          data={programDetails?.data || []}
          // @ts-expect-error
          columns={columns}
          theme='aphl'
          pagination
          fixedHeader
          customStyles={customStyles}
          // @ts-expect-error
          progressPending={Boolean(!programDetails?.data)}
          progressComponent={<LoadingIndicator/>}
        />
      </Col>
    )
  }
}

export default Template
