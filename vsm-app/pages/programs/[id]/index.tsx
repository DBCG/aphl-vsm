import React, { useState } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Modal from 'react-modal'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useGetProgramDetails, Result } from '@/hooks/useGetProgramDetails'
import { useIsEditing } from '@/hooks/useIsEditing'
import { ProgramDetailTable } from '@/components/ProgramDetailTable'
import { is } from '@/helpers/is'

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  &.inputs {
    gap: 24px;
    margin-bottom: 16px;
  }
  &.readonly-inputs {
    justify-content: flex-start;
    column-gap: 8px;
    row-gap: 14px;
    margin-bottom: 12px;

  }
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

export const ItemWrapper = styled.div`
  color: var(--theme-500);
  min-width: 300px;
`

export const FieldTitle = styled.div`
  background-color: white;
  display: inline-block;
  max-width: 120px;
  padding: 4px 8px;
  margin-right: 8px;
  border-radius: 4px;
`

const StyledSpan = styled.span`
  color: var(--theme-500);
  margin-top: 12px;
`
export const FieldValue = styled.span``

const ProgramDetails: NextPage = () => {
  const router = useRouter()
  const [ isEditing, setIsEditing ] = useIsEditing()
  const identifier = router.query.id as string
  const programAndGrouperInfo = useGetProgramDetails(identifier) as Result

  // early return if no data, id must exist if there's data
  if (!is.library(programAndGrouperInfo.program)) {
    return null
  }

  const {
    id='', name='', version='', title='', description=''
  } = programAndGrouperInfo?.program

  const tableData = { id, name, version, title, description }
  const onClick = () => {
    router.push(`/programs/${id}/valuesets`)
  }

  // when editing is live, work happens in the modal
  const handleEditButton = (e) => {
    e.preventDefault()
    console.log('pressed')
    setIsEditing()
  }

  Modal.setAppElement('#__next');

  return (
    <Col>
      <Row style={{ justifyContent: 'space-between' }}>
        <PageTitle style={{ marginRight: '12px'}}>Program Details: <i style={{ textTransform: 'none'}}>{ id }</i></PageTitle>
        <Button
          style={{ marginBottom: '12px', width: '150px' }}
          text='Edit Program'
          onClick={handleEditButton}
        />
      </Row>
      <Modal
        isOpen={isEditing}
        // onAfterOpen={afterOpenModal}
        // onRequestClose={setIsEditing({ editing: false })}
        // style={customStyles}
        contentLabel="Example Modal"
      >
        {/* EDITING WILL BE IN HERE */}
        <button onClick={() => setIsEditing()}>close</button>
        <form>
          <p>edit program will be in here</p>
        </form>
      </Modal>
      {false ? (
        <div>
          <Row className='inputs'>
            <SearchInput id='prog-id' label='ID' def={id} />
            <SearchInput id='prog-name' label='Name' minWidth={400} def={name} />
            <SearchInput id='prog-version' label='Version' def={version} />
            <SearchInput id='prog-title' label='Title' def={title} />
            <TextArea id='prog-desc' label='Description' minWidth={500} def={description} />
          </Row>
          <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
            <StyledSpan>Included ValueSet Groups</StyledSpan>
            <Button text='Edit ValueSets'
              onClick={onClick}
            />
          </Row>
        </div>
      ) : (
          <div>
            <Row className='readonly-inputs'>
              <ItemWrapper>
                <FieldTitle>ID </FieldTitle>
                <FieldValue>{ id }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Title </FieldTitle>
                <FieldValue>{ title }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Name </FieldTitle>
                <FieldValue>{ name }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Version </FieldTitle>
                <FieldValue>{ version }</FieldValue>
              </ItemWrapper>
              <ItemWrapper>
                <FieldTitle>Description </FieldTitle>
                <FieldValue>{ description }</FieldValue>
              </ItemWrapper>
          </Row>
          <Row style={{ alignItems: 'center', marginBottom: '12px' }}>
            <StyledSpan>Included ValueSet Groups</StyledSpan>
            <Button text='View ValueSets'
              onClick={onClick}
            />
          </Row>
          </div>
      )}
      <ProgramDetailTable data={programAndGrouperInfo?.grouperData}/>
    </Col>
  )
}

export default ProgramDetails
