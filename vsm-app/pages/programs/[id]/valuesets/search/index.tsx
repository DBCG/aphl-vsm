import { ChangeEvent, SyntheticEvent, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import ReactModal from 'react-modal'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.min.css'
import { useGetConditions } from '@/hooks/useGetConditions'
import { buildConditionOptions, formatConditionsComposeInclude } from '@/helpers/conditionHelpers'
import { StyledLabel } from '@/components/SearchInput'
import { SearchTable } from '@/components/SearchTable'
import LoadingIndicator from '@/components/LoadingIndicator'
import { Button } from '@/components/buttons/Button'
import { PageTitle } from '@/components/Typography'
import { IconButton } from '@/components/buttons/IconButton'
import { dedupeArray } from '@/helpers/dedupeArray'
import { useGetGroups } from '@/hooks/useGetGroups'
import { SearchResponse, FetchError } from 'pages/api/valueset/search'
import { getSession, GetSessionParams } from 'next-auth/react'
import { formatValuesetDate } from '@/helpers/formatDates'
import { TextArea } from '@/components/TextArea'
import { terminologyServerEndpoints } from 'fhirClientOptions'
import { ValueSetSearchTable } from '@/components/ValueSetSearchTable'

const searchTypes = [
  { label: 'OID', value: 'oid' },
  { label: 'Name', value: 'name' },
  { label: 'URL', value: 'url' }
]

const searchInfoText = {
  oid: 'OID search supports a comma-delimited list, max 100 OIDs',
  name: 'Name search finds full or partial matches within VS name',
  url: 'URL search requires a full URL'
}

const oidRegex = new RegExp('^([0-2])((.0)|(.[1-9][0-9]*))*$')

interface QueryStringItems {
  searchType: string
  count: string
  sortBy: string
  sortDirection: string
  offset: string
  terminologyServer: string
}
const TitleRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  column-gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const StyledForm = styled.form`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  column-gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const DescriptionText = styled.p`
  color: var(--theme-500);
  line-height: 160%;
`

const LinkText = styled.a`
  text-decoration: underline;
  cursor: pointer;
`

interface SubmitProps {
  hide: boolean
}

export const SubmitSelectedForm = styled.form<SubmitProps>`
  padding: 12px 18px;
  background-color: var(--theme-100);
  max-height: ${(props) => (props.hide ? '0' : '1000px')};
  padding: ${(props) => (props.hide ? '0' : 'auto')};
  transition: all 0.3s;
`

const InnerFormRow = styled.div`
  display: flex;
  flex-direction: row;
`

const Col = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: fit-content;
`

const ErrorText = styled.span`
  color: darkRed;
  font-size: 90%;
  margin-left: 0;
`

const SelectInputContainer = styled.div`
  min-width: 300px;
`

const ModalContent = styled.div`
  display: flex;
  height: 80%;
  flex-direction: row;
  justify-content: center;
  align-self: center;
  align-items: center;
`

const ModalColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-self: center;
  justify-content: center;
  align-items: center;
  text-align: center;
`

const ModalTitle = styled.h1``

const ErrorBlock = styled.div`
  background-color: white;
  border-left: 2px solid red;
  border-bottom: 2px solid red;
  padding: 4px 6px;
  margin-top: 12px;
  position: relative;
`

const GroupsRequired = styled.i`
  color: var(--accent);
  font-size: 80%;
`

const ErrorBlockText = styled.p`
  margin-top: 0;
  margin-bottom: 8px;
  &:last-of-type {
    margin-bottom: 0;
  }
`

const CopyButton = styled.button`
  background-color: transparent;
  position: absolute;
  top: 4px;
  right: 6px;
  padding: 0px 6px 4px 6px;
`

const paginationMaximum = 100

const columnSortMap = {
  1: 'name',
  3: 'lastupdated',
  4: 'version',
  5: 'publisher'
}

interface Error {
  type: 'invalid-oid' | 'missing-data' | 'oid-not-found'
  message: string
}

const formatGrouperValueSets = (grouperVsets: fhir4.ValueSet[]) => {
  if (!grouperVsets) return []
  return grouperVsets?.map((vSet: fhir4.ValueSet) => ({
    label: vSet?.title?.replace('_', ''),
    url: vSet?.url,
    version: vSet?.version,
    id: vSet?.id,
    value: vSet?.url
  }))
}

const copyText = (txt: string) => navigator.clipboard.writeText(txt)

interface SearchReponseParams {
  searchContext: 'filter' | 'search'
  response: Response | undefined
}

const defaultOffsets = {
  first: '0',
  next: null,
  previous: null,
  last: null
}

const ValueSets = () => {
  const router = useRouter()
  const programId = router.query.id as string

  return (
    <Col>
      <PageTitle>Add ValueSets: {programId}</PageTitle>
      <DescriptionText>
        Valuesets added here will default to the most recent version available.
        <br />
        After adding a valueset to the program, you may specify a different version on{' '}
        <LinkText href={`/programs/${programId}/valuesets`}>this page</LinkText>.
      </DescriptionText>
      <ValueSetSearchTable tableContext="search-page" />
    </Col>
  )
}

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context)

  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false
      }
    }
  }

  return {
    props: { session }
  }
}

export default ValueSets
