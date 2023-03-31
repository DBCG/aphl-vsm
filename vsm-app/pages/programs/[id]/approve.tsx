import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useRouter } from 'next/router'
import Select, { SingleValue } from 'react-select'
import { PageTitle } from '@/components/Typography'
import { StyledSpan } from '@/styles'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { StyledLabel } from '@/components/InputLabel'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import type { NextPage } from 'next'

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin-bottom: 48px;
`

const StyledDateInput = styled.input.attrs({
  type: 'date'
})`
  margin-bottom: 24px;
`

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
`

const SubtitleRow = styled(Row)`
  margin-bottom: 8px;
`

const LabelStyled = styled(StyledLabel)`
  margin-bottom: 0;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
  gap: 8px;
`

// http://hl7.org/fhir/R4/valueset-contact-point-system.html
const contactOptions = {
  phone: {
    display: 'Phone',
    validation: 'number'
  },
  fax: {
    display: 'Fax',
    validation: 'number'
  },
  email: {
    display: 'Email',
    validation: 'email'
  }
}

const artifactCommentTypes = {
  documentation: 'Documentation',
  review: 'Review',
  guidance: 'Guidance'
}

interface formData {
  approvalDate: Date
  endorserName: string
  endorserContact: string
  endorserContactType: keyof typeof contactOptions | ''
  endorserContactValue: string
  artifactCommentType: keyof typeof artifactCommentTypes | ''
  artifactCommentText: string
  artifactCommentTarget: string
  artifactCommentReference: string
  artifactCommentUser: string
}

const ApproveInfoForm: NextPage = () => {
  const router = useRouter()
  const programAndGrouperInfo = useGetProgramDetails(router.query.id as string)
  const [approvalFormData, setApprovalFormData] = React.useState<formData>({
    approvalDate: new Date(),
    endorserName: '',
    endorserContact: '',
    endorserContactType: '',
    endorserContactValue: '',
    artifactCommentType: '',
    artifactCommentText: '',
    artifactCommentTarget: '',
    artifactCommentReference: '',
    artifactCommentUser: ''
  })

  const handleApprove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const parameterObj = createParametersObj(approvalFormData)
    const approveEndpoint = `/api/programs/${(programAndGrouperInfo.program as fhir4.Library).id}/approve`
    return fetch(approveEndpoint, {
      method: 'POST',
      body: JSON.stringify(parameterObj)
    })
  }
  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement> | SingleValue<{ label: string; value: string }>,
    fieldName: keyof formData
  ) => {
    if (!e) {
      console.error('undefined event in Approve form!')
      return
    }
    if ('label' in e) {
      // this is a React Select component changeEvent
      setApprovalFormData({
        ...approvalFormData,
        [fieldName]: e.value
      })
    } else {
      // this is a regular input component changeEvent
      if (fieldName === 'approvalDate') {
        const newDate = new Date(e?.target?.value || '')
        if (newDate.toString() !== 'Invalid Date') {
          setApprovalFormData({
            ...approvalFormData,
            [fieldName]: newDate
          })
        }
      } else {
        setApprovalFormData({
          ...approvalFormData,
          [fieldName]: e.target.value
        })
      }
    }
  }
  const createParametersObj = (params: formData) => {
    const parametersObj: fhir4.Parameters = { resourceType: 'Parameters' }
    parametersObj.parameter = []
    for (const key in params) {
      if (key === 'approvalDate') {
        parametersObj.parameter.push({
          name: 'approvalDate',
          valueDate: approvalFormData.approvalDate.toISOString()
        })
      } else if (key === 'endorserName' && approvalFormData.endorserName) {
        parametersObj.parameter.push({
          name: 'endorser',
          valueContactDetail: {
            name: approvalFormData.endorserName,
            telecom: approvalFormData.endorserContactValue
              ? [
                  {
                    value: approvalFormData.endorserContactValue,
                    system: approvalFormData.endorserContactType || undefined
                  }
                ]
              : undefined
          }
        })
      } else {
        // stop TS worrying about approvalDate being a Date type
        const val = params[key as keyof Omit<formData, 'approvalDate'>]
        if (val) {
          parametersObj.parameter.push({
            name: key,
            valueString: val
          })
        }
      }
    }
    return parametersObj
  }
  return (
    <>
      <Row>
        <PageTitle>Approve</PageTitle>
      </Row>
      <Row>
        <LabelStyled>Approval Date</LabelStyled>
      </Row>
      <StyledDateInput
        value={approvalFormData.approvalDate.toISOString().slice(0, 10)}
        onChange={(e) => handleFieldChange(e, 'approvalDate')}
      />
      <GridContainer>
        <Col>
          <SubtitleRow>
            <StyledSpan>Endorser</StyledSpan>
          </SubtitleRow>
          <LabelStyled>Type</LabelStyled>
          <Select
            defaultValue={{ value: '', label: 'Please select Contact Type' }}
            onChange={(e) => handleFieldChange(e, 'endorserContactType')}
            options={Object.entries(contactOptions).map(([key, value]) => ({ label: value.display, value: key }))}
          />
          <SearchInput
            id="contact"
            label="Contact"
            value={approvalFormData.endorserContactValue}
            onChange={(e) => handleFieldChange(e, 'endorserContactValue')}
          />
          <SearchInput
            id="Name"
            label="Name"
            value={approvalFormData.endorserName}
            onChange={(e) => handleFieldChange(e, 'endorserName')}
          />
        </Col>
        <Col>
          <SubtitleRow>
            <StyledSpan>Artifact Comment</StyledSpan>
          </SubtitleRow>
          <LabelStyled>Type</LabelStyled>
          <Select
            defaultValue={{ value: '', label: 'Please select Comment Type' }}
            onChange={(e) => handleFieldChange(e, 'artifactCommentType')}
            placeholder="Select Type"
            options={Object.entries(artifactCommentTypes).map(([key, value]) => ({ value: key, label: value }))}
          />
          <SearchInput
            id="Text"
            label="Text"
            value={approvalFormData.artifactCommentText}
            onChange={(e) => handleFieldChange(e, 'artifactCommentText')}
          />
          <SearchInput
            id="Target"
            label="Target"
            value={approvalFormData.artifactCommentTarget}
            onChange={(e) => handleFieldChange(e, 'artifactCommentTarget')}
          />
          <SearchInput
            id="Reference"
            label="Reference"
            value={approvalFormData.artifactCommentReference}
            onChange={(e) => handleFieldChange(e, 'artifactCommentReference')}
          />
          <SearchInput
            id="User"
            label="User"
            value={approvalFormData.artifactCommentUser}
            onChange={(e) => handleFieldChange(e, 'artifactCommentUser')}
          />
        </Col>
      </GridContainer>
      <Row style={{ justifyContent: 'center' }}>
        <Button text="Submit" onClick={handleApprove} />
      </Row>
    </>
  )
}

export default ApproveInfoForm
