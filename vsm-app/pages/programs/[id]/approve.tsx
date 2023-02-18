import React from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { PageTitle } from '@/components/Typography';
import { StyledSpan } from '.';
import { Button } from '@/components/buttons/Button';
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails';
import type { NextPage } from 'next';

const Input = styled.input`
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`;

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
`;

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
  padding:25px;
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
    <Col>
      <Row>
        <PageTitle>
          Approve
        </PageTitle>
      </Row>
      <Row>
        <StyledSpan>Approval Date</StyledSpan>
      </Row>
      <input
        type={"date"}
        value={approvalFormData.approvalDate.toISOString().slice(0, 10)}
        onChange={(e) => handleFieldChange(e, 'approvalDate')}></input>
      <Row>
        <Col>
          <Row>
            <StyledSpan>Endorser</StyledSpan>
          </Row>
          <label>Name</label>
          <Input
            type={"text"}
            value={approvalFormData.endorserName}
            onChange={(e) => handleFieldChange(e, 'endorserName')}></Input>
          <label>Contact</label>
          <Input
            type={"text"}
            value={approvalFormData.endorserContactValue}
            onChange={(e) => handleFieldChange(e, 'endorserContactValue')}></Input>
          <label >Type</label>
          <select
            value={approvalFormData.endorserContactType}
            onChange={(e) => handleFieldChange(e, 'endorserContactType')}>
            <option disabled value={''}>Select Type</option>
            {Object.entries(contactOptions)
              .map(([key, value]) => <option key={key} value={key}>{value.display}</option>)}
          </select>
        </Col>
        <Col>
          <StyledSpan>Artifact Comment</StyledSpan>

          <label>Type</label>
          <select
            value={approvalFormData.artifactCommentType}
            onChange={(e) => handleFieldChange(e, 'artifactCommentType')}>
            <option disabled value={''}>Select Type</option>
            {Object.entries(artifactCommentTypes)
              .map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select>

          <label>Text</label>
          <Input
            type={"text"}
            value={approvalFormData.artifactCommentText}
            onChange={(e) => handleFieldChange(e, 'artifactCommentText')}></Input>

          <label>Target</label>
          <Input
            type={"text"}
            value={approvalFormData.artifactCommentTarget}
            onChange={(e) => handleFieldChange(e, 'artifactCommentTarget')}></Input>

          <label>Reference</label>
          <Input
            type={"text"}
            value={approvalFormData.artifactCommentReference}
            onChange={(e) => handleFieldChange(e, 'artifactCommentReference')}></Input>

          <label>User</label>
          <Input
            type={"text"}
            value={approvalFormData.artifactCommentUser}
            onChange={(e) => handleFieldChange(e, 'artifactCommentUser')}></Input>
        </Col>
      </Row>

      <Row>
        <Button
          text='Submit'
          style={{ width: "100%" }}
          onClick={handleApprove}
        />
      </Row>
    </Col>
  );
};

export default ApproveInfoForm;