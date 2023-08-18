import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Select, { Options, SingleValue } from 'react-select'
import { PageTitle } from '@/components/Typography'
import { StyledSpan } from '@/styles'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import type { NextPage } from 'next'
import { toast } from 'react-toastify'
import { Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import {
  Row,
  SubtitleRow,
  LabelStyled,
  Col,
  GridContainer
} from './styles'

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

export interface approvalFormParams {
  approvalDate: Date
  artifactCommentType: keyof typeof artifactAssessmentInfoTypes
  artifactCommentText: string
  artifactCommentTarget: string
  artifactCommentReference: string
  artifactCommentUser?: string
}

const ApproveInfoForm: NextPage = () => {
  const router = useRouter()
  const programId = router.query.id as string
  const { programAndGrouperData } = useGetProgramDetails({ id: programId })
  const [loading, setLoading] = useState(false)
  const [approvalFormData, setApprovalFormData] = useState<approvalFormParams>({
    approvalDate: new Date(),
    artifactCommentType: 'comment',
    artifactCommentText: '',
    artifactCommentTarget: '',
    artifactCommentReference: ''
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
      artifactCommentReference: ''
    })
  }, [programAndGrouperData?.program])

  const handleApprove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setLoading(true)
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
        setLoading(false)
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
    parametersObj.parameter = [] as fhir4.ParametersParameter[]

    Object.keys(approvalFormData).forEach((name) => {
      if (name === 'approvalDate') {
        parametersObj?.parameter?.push({ name, valueDate: approvalFormData.approvalDate.toISOString() })
      } else if (name === 'artifactCommentText' || name === 'artifactCommentType') {
        parametersObj?.parameter?.push({ name, valueString: approvalFormData[name] })
      } else {
        // @ts-ignore
        parametersObj?.parameter?.push({ name, valueCanonical: approvalFormData[name] })
      }
    })

    return parametersObj
  }

  return (
    <>
      <Row>
        <PageTitle style={{ marginBottom: '2rem' }}>Approve</PageTitle>
      </Row>
      <GridContainer>
        <Col>
          <SubtitleRow>
            <StyledSpan>Artifact Comment</StyledSpan>
          </SubtitleRow>
          <LabelStyled>
            Type{' '}
            <Tooltip title="Approval type" placement="top" arrow>
              <InfoIcon sx={{ width: '15px', height: '15px' }} />
            </Tooltip>
          </LabelStyled>
          <Select
            styles={{
              menu: (baseStyles, state) => ({
                ...baseStyles,
                zIndex: 10
              })
            }}
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
            helperMessage="Text description for the program comment"
            value={approvalFormData.artifactCommentText}
            // @ts-ignore
            onChange={(e) => handleFieldChange(e, 'artifactCommentText')}
          />
          <SearchInput
            id="target"
            label="Target"
            value={approvalFormData.artifactCommentTarget}
            helperMessage="Target of the program comment"
            readonly={true}
          />
          <SearchInput
            id="reference"
            label="Reference"
            helperMessage="Reference to the program being commented on"
            value={approvalFormData.artifactCommentReference}
            onChange={(e) => handleFieldChange(e, 'artifactCommentReference')}
          />
        </Col>
      </GridContainer>
      <Row style={{ justifyContent: 'center' }}>
        <Button id="submit-approve" text="Submit" onClick={handleApprove} loading={loading} />
      </Row>
    </>
  )
}

export default ApproveInfoForm
