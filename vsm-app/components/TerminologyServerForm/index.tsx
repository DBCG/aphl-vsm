import React, { useEffect, useRef, useState } from 'react'
import Select, { SelectInstance } from 'react-select'
import { StyledSpan } from '@/styles'
import { Button } from '@/components/buttons/Button'
import { SearchInput } from '@/components/SearchInput'
import { Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { Row, SubtitleRow, LabelStyled, Col, GridContainer } from './styles'
import { authenticationOptions } from './types'
import { useRouter } from 'next/router'
import { EndpointRequest } from '@/pages/api/endpoint'
import { debounce } from 'lodash'
import { FhirResource } from 'fhir/r4'
import { ErrorMessage } from '../ErrorMessage'
import { toast } from 'react-toastify'
export const authenticationTypeUrl = 'http://aphl.org/fhir/vsm/StructureDefinition/vsm-endpoint-authentication-type'
export const getAuthenticationTypeString = (extensions: fhir4.Extension[]) =>
  extensions.find((ext) => ext.url === authenticationTypeUrl)?.valueString
export const TerminologyServerForm = ({ endpoint }: { endpoint?: fhir4.Endpoint }) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [nameError, setNameError] = useState('')
  const [endpointToUpdate, setEndpointToUpdate] = useState<fhir4.Endpoint>()
  const name = useRef<HTMLInputElement>(null)
  const address = useRef<HTMLInputElement>(null)
  const authenticationType = useRef<SelectInstance<{ value: string; label: string } | null>>(null)
  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    toast.dismiss()
    e.preventDefault()
    setLoading(true)
    if (!address?.current?.value.trim()) {
      setAddressError('Error: Address cannot be empty')
    }
    if (!name?.current?.value.trim()) {
      setNameError('Error: Name cannot be empty')
    }
    if (!name?.current?.value.trim() || !address?.current?.value.trim()) {
      setLoading(false)
      return
    }
    const updatedEndpoint: fhir4.Endpoint = {
      ...(endpointToUpdate || {}),
      resourceType: 'Endpoint',
      identifier: [{ value: 'terminologyEndpoint' }],
      connectionType: { code: 'fhir', system: 'http://hl7.org/fhir/ValueSet/endpoint-connection-type' },
      status: 'active',
      payloadType: [],
      name: name?.current?.value,
      address: address?.current?.value || ''
    }
    updatedEndpoint.extension ??= []
    const authenticationTypeValue = authenticationType.current?.getValue()?.[0]?.value
    const authenticationExtension = updatedEndpoint.extension?.find((ext) => ext.url === authenticationTypeUrl)
    if (authenticationExtension) {
      authenticationExtension.valueString = authenticationTypeValue
    } else {
      updatedEndpoint.extension.push({ url: authenticationTypeUrl, valueString: authenticationTypeValue })
    }
    const url = `/api/endpoint`
    const body: EndpointRequest['body'] = { endpoint: updatedEndpoint }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then((res) => res.json() as Promise<fhir4.Endpoint | FhirResource>)
      if (response?.resourceType === 'Endpoint') {
        toast.success(`Successfully ${!!endpointToUpdate ? 'updated' : 'created'} Endpoint`)
        if (!router.query.id) {
          router.push(`/admin-tools/edit-endpoint/${response.id!}`)
        }
        setEndpointToUpdate(response)
        setLoading(false)
      }
    } catch (err: any) {
      setLoading(false)
      toast.error(err?.error || typeof err === 'string' ? err : 'Error updating endpoint')
      console.error(err)
    }
  }
  async function validateWithHttpCall(address: string) {
    const invalid = 'Warning: The address provided could not be resolved'
    return fetch(address, { method: 'HEAD', mode: 'no-cors' })
      .then(() => setAddressError(''))
      .catch(() => setAddressError(invalid))
  }
  function isValidUrl(url: string) {
    try {
      new URL(url)
    } catch (_) {
      setAddressError('Error: The address provided is malformed')
      return false
    }
    setAddressError('')
    return true
  }
  const debouncedValidateWithHTTPCall = debounce(validateWithHttpCall, 1500)
  const debouncedValidUrl = debounce(isValidUrl, 150)
  useEffect(() => {
    if (!!endpoint) {
      setEndpointToUpdate(endpoint)
    }
  }, [endpoint])
  useEffect(() => {
    if (address.current) {
      address.current.value = endpointToUpdate?.address || ''
    }
    if (authenticationType.current) {
      const type = endpointToUpdate?.extension?.find((ext) => ext?.url === authenticationTypeUrl)?.valueString
      const authenticationOption = authenticationOptions.find((a) => a.value === type)
      if (authenticationOption) {
        authenticationType.current.setValue(authenticationOption, 'select-option')
      }
    }
    if (name.current) {
      name.current.value = endpointToUpdate?.name || ''
    }
  }, [endpointToUpdate])
  return (
    <>
      <GridContainer>
        <Col>
          <SubtitleRow>
            <StyledSpan>{endpoint ? 'Edit' : 'Add'} Endpoint</StyledSpan>
          </SubtitleRow>
          <SearchInput
            id="name"
            label="Name"
            helperMessage="Human readable name for the Endpoint"
            inputRef={name}
            errorMessage={nameError}
            onChange={(e) => {
              if (e.target.value.trim()) {
                setNameError('')
              }
            }}
            disabled={loading}
          />
          <SearchInput
            id="address"
            label="Address"
            helperMessage="Endpoint address / URL"
            inputRef={address}
            errorMessage={addressError}
            onChange={(v) => {
              const address = v.target.value
              if (!address) {
                setAddressError('')
                return
              }
              if (debouncedValidUrl(address)) {
                debouncedValidateWithHTTPCall(address)
              }
            }}
            onBlur={(v) => {
              const address = v.target.value
              if (isValidUrl(address)) {
                validateWithHttpCall(address)
              }
            }}
            disabled={loading}
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
            isDisabled={loading}
          />
        </Col>
      </GridContainer>
      <Row style={{ justifyContent: 'center' }}>
        <Button
          style={{ marginRight: '15px' }}
          id="submit-approve"
          text="Submit"
          onClick={handleSubmit}
          loading={loading}
          disabled={loading}
        />
        <Button
          style={{ marginLeft: '15px' }}
          id="back-to-admin-tools"
          text="Back to Admin Tools"
          onClick={() => router.push('/admin-tools')}
          disabled={loading}
        />
      </Row>
    </>
  )
}
