import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useRouter } from 'next/router'
import Select, { Options, SingleValue } from 'react-select'
import { PageTitle } from '@/components/Typography'
import { StyledSpan } from '@/styles'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { StyledLabel } from '@/components/InputLabel'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import type { NextPage } from 'next'
import { toast } from 'react-toastify'
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
export const EmailPattern: RegExp = /^[^\W_]+([._-][^\W_]+)*@[^\W_]+([.-][^\W_]+)*\.[a-z]{2,4}$/
const numberValidator = (val: string) => Number.isInteger(Number(val.replace(' ', '')))
// http://hl7.org/fhir/R4/valueset-contact-point-system.html
const contactTypes = {
  '': {
    display: 'Please select a contact type',
    validation: () => true
  },
  phone: {
    display: 'Phone',
    validation: numberValidator
  },
  fax: {
    display: 'Fax',
    validation: numberValidator
  },
  email: {
    display: 'Email',
    validation: (val: string) => val.match(EmailPattern)
  }
}

export const artifactAssessmentInfoTypes = {
  comment: 'Comment',
  classifier: 'Classifier',
  rating: 'Rating',
  response: 'Response',
  'change-request': 'Change Request'
  // technically container is
  // a valid response but disabling
  // it since it doesn't make
  // sense in the context
  // of an approval
  // container: 'Container',
}
const artifactAssessmentInfoTypeOptions: Options<{ value: keyof typeof artifactAssessmentInfoTypes; label: string }> = Object.entries(
  artifactAssessmentInfoTypes
).map(([key, value]) => ({ value: key, label: value })) as Options<{ value: keyof typeof artifactAssessmentInfoTypes; label: string }>
const contactTypeOptions: Options<{ value: keyof typeof contactTypes; label: string }> = Object.entries(contactTypes).map(
  ([key, value]) => ({ value: key, label: value.display })
) as Options<{ value: keyof typeof contactTypes; label: string }>
export interface approvalFormParams {
  approvalDate: Date
  artifactCommentType: keyof typeof artifactAssessmentInfoTypes
  artifactCommentText: string
  artifactCommentTarget: string
  artifactCommentReference: string
  artifactCommentUser: string
}

const ApproveInfoForm: NextPage = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const { programAndGrouperData } = useGetProgramDetails({ id: programId })
  const [approvalFormData, setApprovalFormData] = React.useState<approvalFormParams>({
    approvalDate: new Date(),
    artifactCommentType: 'comment',
    artifactCommentText: '',
    artifactCommentTarget: '',
    artifactCommentReference: '',
    artifactCommentUser: ''
  })
  useEffect(() => {
    let target: string = ''
    const url = programAndGrouperData?.program?.url
    const version = programAndGrouperData?.program?.version
    if (!!url) {
      target += url
    }
    if (!!version) {
      if (!!url) {
        target += '|'
      }
      target += version
    }
    setApprovalFormData({
      approvalDate: new Date(),
      artifactCommentType: 'comment',
      artifactCommentText: '',
      artifactCommentTarget: target || '',
      artifactCommentReference: '',
      artifactCommentUser: ''
    })
  }, [programAndGrouperData?.program])

  const handleApprove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const parameterObj = createParametersObj()
    const approveEndpoint = `/api/programs/${(programAndGrouperData.program as fhir4.Library).id}/approve`
    return fetch(approveEndpoint, {
      method: 'POST',
      body: JSON.stringify(parameterObj)
    }).then((res) => {
      if (res.ok) {
        toast.dismiss()
        router.push(`/programs/${router.query.id}`)
      } else {
        toast.error('Error approving artifact assessment', {
          position: 'bottom-right',
          style: {
            borderRadius: 0
          }
        })
        res.json().then((error) => console.error(error))
      }
    })
  }
  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement> | SingleValue<{ label: string; value: string }>,
    fieldName: keyof approvalFormParams
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
  const createParametersObj = () => {
    const parametersObj: fhir4.Parameters = { resourceType: 'Parameters' }
    parametersObj.parameter = []
    parametersObj.parameter.push({
      name: 'approvalDate',
      valueDate: approvalFormData.approvalDate.toISOString()
    })
    if (approvalFormData.artifactCommentTarget) {
      parametersObj.parameter.push({
        name: 'artifactCommentTarget',
        valueCanonical: approvalFormData.artifactCommentTarget
      })
    }
    if (approvalFormData.artifactCommentReference) {
      parametersObj.parameter.push({
        name: 'artifactCommentReference',
        valueCanonical: approvalFormData.artifactCommentReference
      })
    }
    if (approvalFormData.artifactCommentUser) {
      parametersObj.parameter.push({
        name: 'artifactCommentUser',
        valueReference: {
          reference: approvalFormData.artifactCommentUser
        }
      })
    }
    if (approvalFormData.artifactCommentText) {
      parametersObj.parameter.push({
        name: 'artifactCommentText',
        valueString: approvalFormData.artifactCommentText
      })
    }
    if (approvalFormData.artifactCommentType) {
      parametersObj.parameter.push({
        name: 'artifactCommentType',
        valueString: approvalFormData.artifactCommentType
      })
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
        readOnly
      />
      <GridContainer>
        <Col>
          <SubtitleRow>
            <StyledSpan>Artifact Comment</StyledSpan>
          </SubtitleRow>
          <LabelStyled>Type</LabelStyled>
          <Select
            value={{
              value: approvalFormData.artifactCommentType,
              label: artifactAssessmentInfoTypes[approvalFormData.artifactCommentType]
            }}
            onChange={(e) => handleFieldChange(e, 'artifactCommentType')}
            options={artifactAssessmentInfoTypeOptions}
            instanceId={'commentType'}
          />
          <TextArea
            id="text"
            label="Text"
            value={approvalFormData.artifactCommentText}
            // @ts-ignore
            onChange={(e) => handleFieldChange(e, 'artifactCommentText')}
          />
          <SearchInput id="target" label="Target" def={approvalFormData.artifactCommentTarget} readonly={true} />
          <SearchInput
            id="reference"
            label="Reference"
            value={approvalFormData.artifactCommentReference}
            onChange={(e) => handleFieldChange(e, 'artifactCommentReference')}
          />
          <SearchInput
            id="user"
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
