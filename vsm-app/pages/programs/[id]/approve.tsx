import React from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { PageTitle } from '@/components/Typography';
import { StyledSpan } from '.';
import { Button } from '@/components/buttons/Button';
import { SearchInput } from '@/components/SearchInput';
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails';
import type { NextPage } from 'next';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin-bottom: 48px;
`;

const Input = styled.input`
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`;

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
`;

const SubtitleRow = styled(Row)`
  margin-bottom: 8px;
`;

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`;
// http://hl7.org/fhir/R4/valueset-contact-point-system.html
const contactOptions = {
  phone: {
    display: "Phone",
    validation: "number"
  },
  fax: {
    display: "Fax",
    validation: "number"
  },
  email: {
    display: "Email",
    validation: "email"
  }
};
const artifactCommentTypes = {
  documentation: 'Documentation',
  review: 'Review',
  guidance: 'Guidance',
};
interface formData {
  approvalDate: Date;
  endorserName: string;
  endorserContact: string;
  endorserContactType: keyof typeof contactOptions | '';
  endorserContactValue: string;
  artifactCommentType: keyof typeof artifactCommentTypes | '';
  artifactCommentText: string;
  artifactCommentTarget: string;
  artifactCommentReference: string;
  artifactCommentUser: string;
}
const ApproveInfoForm: NextPage = () => {
  const router = useRouter();
  const programAndGrouperInfo = useGetProgramDetails(router.query.id as string);
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
    artifactCommentUser: '',
  });

  const handleApprove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const parameterObj = createParametersObj(approvalFormData);
    const approveEndpoint = `/api/programs/${(programAndGrouperInfo.program as fhir4.Library).id}/approve`;
    return fetch(approveEndpoint, {
      method: 'POST',
      body: JSON.stringify(parameterObj)
    });
  };
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, fieldName: keyof formData) => {
    if (fieldName === 'approvalDate') {
      const newDate = new Date(e.target.value);
      if (newDate.toString() !== 'Invalid Date') {
        setApprovalFormData({
          ...approvalFormData,
          [fieldName]: newDate
        });
      }
    } else {
      setApprovalFormData({
        ...approvalFormData,
        [fieldName]: e.target.value
      });
    }
  };
  const createParametersObj = (params: formData) => {
    const parametersObj: fhir4.Parameters = { resourceType: "Parameters" };
    parametersObj.parameter = [];
    for (const key in params) {
      if (key === 'approvalDate') {
        parametersObj.parameter.push({
          name: 'approvalDate',
          valueDate: approvalFormData.approvalDate.toISOString()
        });
      } else if (key === 'endorserName' && approvalFormData.endorserName) {
        parametersObj.parameter.push({
          name: 'endorser',
          valueContactDetail: {
            name: approvalFormData.endorserName,
            telecom: approvalFormData.endorserContactValue ? [{
              value: approvalFormData.endorserContactValue,
              system: approvalFormData.endorserContactType || undefined
            }] : undefined
          }
        });
      } else {
        // stop TS worrying about approvalDate being a Date type
        const val = params[key as keyof Omit<formData, 'approvalDate'>];
        if (val) {
          parametersObj.parameter.push({
            name: key,
            valueString: val
          });
        }
      }
    }
    return parametersObj;
  };
  return (
    <>
      <Row>
        <PageTitle>
          Approve
        </PageTitle>
      </Row>
      <Row>
        <StyledSpan>Approval Date</StyledSpan>
      </Row>
      <StyledDateInput
        value={approvalFormData.approvalDate.toISOString().slice(0, 10)}
        onChange={(e) => handleFieldChange(e, 'approvalDate')}/>
      <GridContainer>
        <Col>
          <SubtitleRow>
            <StyledSpan>Endorser</StyledSpan>
          </SubtitleRow>
          <SearchInput
            id='Name'
            label='Name'
            value={approvalFormData.endorserName}
            onChange={(e) => handleFieldChange(e, 'endorserName')}/>
          <SearchInput
            id='contact'
            label='Contact'
            value={approvalFormData.endorserContactValue}
            onChange={(e) => handleFieldChange(e, 'endorserContactValue')}/>
          <label>Type</label>
          <select
            value={approvalFormData.endorserContactType}
            onChange={(e) => handleFieldChange(e, 'endorserContactType')}>
            <option disabled value={''}>Select Type</option>
            {Object.entries(contactOptions)
              .map(([key, value]) => <option key={key} value={key}>{value.display}</option>)}
          </select>
        </Col>
        <Col>
          <SubtitleRow>
            <StyledSpan>Artifact Comment</StyledSpan>
          </SubtitleRow>
          <label>Type</label>
          <select
            value={approvalFormData.artifactCommentType}
            onChange={(e) => handleFieldChange(e, 'artifactCommentType')}>
            <option disabled value={''}>Select Type</option>
            {Object.entries(artifactCommentTypes)
              .map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select>
          <SearchInput
            id='Text'
            label='Text'
            value={approvalFormData.artifactCommentText}
            onChange={(e) => handleFieldChange(e, 'artifactCommentText')}/>
          <SearchInput
            id='Target'
            label='Target'
            value={approvalFormData.artifactCommentTarget}
            onChange={(e) => handleFieldChange(e, 'artifactCommentTarget')}/>
          <SearchInput
            id='Reference'
            label='Reference'
            value={approvalFormData.artifactCommentReference}
            onChange={(e) => handleFieldChange(e, 'artifactCommentReference')}/>
          <SearchInput
            id='User'
            label='User'
            value={approvalFormData.artifactCommentUser}
            onChange={(e) => handleFieldChange(e, 'artifactCommentUser')}/>
        </Col>
      </GridContainer>

      <Row>
        <Button
          text='Submit'
          style={{ width: "100%" }}
          onClick={handleApprove}
        />
      </Row>
    </>
  );
};

export default ApproveInfoForm;