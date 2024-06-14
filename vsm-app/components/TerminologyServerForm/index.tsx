import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Select, { SelectInstance, SingleValue } from 'react-select'
import { StyledSpan } from '@/styles'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { TextArea } from '@/components/TextArea'
import { toast } from 'react-toastify'
import { Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { Row, SubtitleRow, LabelStyled, Col, GridContainer } from './styles'
import { approvalFormParams, authenticationOptions, authenticationTypes } from './types'

type ApproveFormProps = {
  programAndGrouperData: any
}

export const TerminologyServerForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [endpoint, setEndpoint] = useState<fhir4.Endpoint>({
    resourceType: 'Endpoint'
  })
  const name = useRef<HTMLInputElement>(null)
  const address = useRef<HTMLInputElement>(null)
  const authenticationType = useRef<SelectInstance<{ value: string; label: string } | null>>(null)

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setLoading(true)
    const updatedEndpoint: fhir4.Endpoint = {
      ...endpoint,
      name: name?.current?.value,
      address: address?.current?.value || '',
      extension: [...(endpoint.extension || []), { url: 'auth', valueString: authenticationType?.current?.getValue()?.[0]?.value }]
    }
    const url = `/api/endpoint`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedEndpoint)
    }).then((res) => res.json())
    if (response?.resourceType === 'Endpoint') {
      setEndpoint(response as fhir4.Endpoint)
    }
  }
  function validateAddress(e: ChangeEvent<HTMLInputElement>) {
    const address = e.target.value
    if (!address) {
      setAddressError('')
      return
    }
    return fetch(address, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          setAddressError('')
        } else {
          setAddressError('Invalid address')
        }
      })
      .catch(() => setAddressError('Invalid address'))
  }

  return (
    <>
      <GridContainer>
        <Col>
          <SubtitleRow>
            <StyledSpan>Add / Edit Endpoint</StyledSpan>
          </SubtitleRow>
          <SearchInput id="name" label="Name" helperMessage="Human readable name for the Endpoint" inputRef={name} />
          <SearchInput
            id="address"
            label="Address"
            helperMessage="Endpoint address / URL"
            inputRef={address}
            errorMessage={addressError}
            onChange={(v) => validateAddress(v)}
          />
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
            defaultValue={authenticationOptions[0]}
            options={authenticationOptions}
            ref={authenticationType}
            onChange={() => authenticationType?.current?.focus()}
            instanceId={'commentType'}
          />
        </Col>
      </GridContainer>
      <Row style={{ justifyContent: 'center' }}>
        <Button id="submit-approve" text="Submit" onClick={handleSubmit} loading={loading} />
      </Row>
    </>
  )
}
