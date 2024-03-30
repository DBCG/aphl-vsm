import { useState, useMemo } from 'react'
import { Checkbox, FormControl, FormControlLabel, FormGroup, Grid } from '@mui/material'
import DT from 'react-data-table-component'
import { Button } from '../buttons/Button'
import { SearchInput } from '../SearchInput'
import Select from 'react-select'
import { PageP, FormErrorText, PageTitle } from '@/components/Typography'
import { buildGroupOptions } from '@/helpers/selectHelpers'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import { useGetProgramDetails } from '@/hooks/useGetProgramDetails'
import Expansion from './Expansion'
import { NextRouter } from 'next/router'
import { Result } from '@/hooks/useGetProgramValueSetDetails'
import { ErrorMessage } from '../ErrorMessage'
import { reactSelectOptionStyle } from '../styleOverrides/reactSelect'
import { CheckBox } from '@mui/icons-material'

interface Props {
  programId: string
  router: NextRouter
}

interface MatchingCodes {
  system: string
  code: string
  version: string | undefined
  display: string | undefined
}

interface Row {
  matchingCodes: MatchingCodes
}

const customStyles = {
  rows: {
    style: {
      padding: '8px 12px'
    }
  }
}

const CodeSearch = ({ programId, router }: Props) => {
  // states for code search/$expand
  const [codeToFind, setCodeToFind] = useState<string | null>(null)
  const [systemToFind, setSystemToFind] = useState<string | null>(null)
  const [groupersToSearch, setGroupersToSearch] = useState<readonly fhir4.ValueSet[] | []>([])
  const [matchingValueSetUrls, setMatchingValueSetUrls] = useState<Row[] | null>(null)
  const [searchProvisionalCodes, setSearchProvisionalCodes] = useState(false)

  // loading states
  const [loadingCodeSearch, setLoadingCodeSearch] = useState(false)

  // error states
  const [error, setError] = useState<null | string>(null)

  const progValueSetDets = useGetProgramValueSetDetails({
    id: programId,
    provisionalOnly: false
  }) as Result

  const {
    programAndGrouperData, programAndGrouperDataLoading
  } = useGetProgramDetails({ id: programId })

  const groupsInProgram = progValueSetDets?.groupsInProgram

  const handleClear = () => {
    setCodeToFind(null)
    setGroupersToSearch([])
    setSystemToFind(null)
    setMatchingValueSetUrls(null)
  }

  const handleSearchCodes = async () => {
    setError(null)
    setLoadingCodeSearch(true)
    try {
      if(!groupersToSearch?.length) return
      const grouperIdsToSearch = groupersToSearch?.map(i => i?.id)?.filter(x => Boolean(x))
  
      let endpoint = `/api/valueset/expand`
      const matches = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          codeSystem: systemToFind,
          groupersToSearch: grouperIdsToSearch,
          codeToFind,
          expansionParameters: programAndGrouperData.manifestData
        })
      }).then((res) => res.json())
      
      setMatchingValueSetUrls(matches)
    } catch (e) {
      setError('Error occurred searching for code')
    }
    setLoadingCodeSearch(false)
  }

  const matchColumns = useMemo(
    () => [
      {
        name: 'System',
        id: 'vs-code-system',
        selector: (row: Row) => row.matchingCodes.system!,
        sortable: false,
        maxWidth: '180px',
        wrap: true
      },
      {
        name: 'Code',
        id: 'vs-code',
        selector: (row: Row) => row.matchingCodes.code!,
        sortable: false,
        maxWidth: '160px',
        wrap: true
      },
      {
        name: 'Code System Version',
        id: 'vs-code-system-version',
        selector: (row: Row) => row?.matchingCodes?.version!,
        sortable: false,
        maxWidth: '260px',
        wrap: true,
      },
      {
        name: 'Display',
        id: 'vs-code-system-version',
        selector: (row: Row) => row?.matchingCodes?.display!,
        sortable: false,
        maxWidth: '320px',
        wrap: true
      },

    ],
    [router, groupsInProgram, matchingValueSetUrls]
  )

  return (
    <div>
      <PageTitle style={{ marginBottom: '2rem' }}>
        Find Codes in Program {programId}
      </PageTitle>
      <FormControl style={{ marginBottom: '24px', marginTop: '1.5rem', width: '100%' }}>
        <FormGroup>
          <FormControlLabel label='Search for VSM Provisional Codes in this Program' control={<Checkbox/>}/>
        </FormGroup>
        <PageP>
          Find ValueSets in this program that...
        </PageP>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <PageP>
              Contain this code:
            </PageP>
            <SearchInput
              onChange={
                (e) => {
                  setCodeToFind(e.target.value)
                }
              }
              value={codeToFind || ''}
              required
              errorMessage={ !codeToFind ? 'Required' : ''}
              label='Code'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PageP>
              In System (optional):
            </PageP>
            <SearchInput
              onChange={
                (e) => {
                  setSystemToFind(e.target.value)
                }}
              label='System'
              value={systemToFind || ''}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PageP>
              In Grouper(s):
            </PageP>
            <Select
              required={true}
              onChange={
                (e) => { setGroupersToSearch(e) }
              }
              isMulti={true}
              styles={reactSelectOptionStyle()}
              value={groupersToSearch}
              menuPlacement="top"
              instanceId="grouper-selector"
              // @ts-ignore-next-line
              options={buildGroupOptions(groupsInProgram)}
            />
            {!groupersToSearch?.length && <FormErrorText>Required</FormErrorText>}
          </Grid>
        </Grid>
        <Grid container justifyContent='flex-end' spacing={2} xs={12} style={{ marginTop: '24px' }}>
            <Button text='Search'
              onClick={() => handleSearchCodes()}
              style={{ marginRight: '8px' }}
              disabled={ !codeToFind || !groupersToSearch.length }
              loading={loadingCodeSearch}
            />
            <Button
              text='Clear'
              onClick={handleClear}
            />
          <Grid container justifyContent='flex-end' xs={12} style={{ marginTop: '12px' }}>
            {(!groupersToSearch?.length || !codeToFind) && <FormErrorText>Code and grouper(s) required to search</FormErrorText>}
          </Grid>
        </Grid>
          { error && (
            <ErrorMessage error={error} />
          )}
      </FormControl>
      {matchingValueSetUrls && (
        <DT
          customStyles={customStyles}
          title={loadingCodeSearch ? '' : `${matchingValueSetUrls.length} match${matchingValueSetUrls.length !== 1 ? 'es' : ''} found in program:`}
          theme='aphl'
          data={matchingValueSetUrls || []}
          progressPending={loadingCodeSearch}
          columns={matchColumns}
          expandableRows
          expandableRowExpanded={() => true}
          // @ts-ignore-next-line (I can't figure this one out)
          expandableRowsComponent={Expansion}
          expandableRowsComponentProps={{ 'groupsInProgram': groupsInProgram }}
        />
      )}
    </div>
  )
}

export default CodeSearch