import { useState, useMemo, useEffect, useCallback } from 'react'
import { FormControl, Grid } from '@mui/material'
import DT from 'react-data-table-component'
import { Button } from '../buttons/Button'
import { SearchInput } from '../SearchInput'
import Select from 'react-select'
import { PageP, FormErrorText, PageTitle } from '@/components/Typography'
import { buildGroupOptions } from '@/helpers/selectHelpers'
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails'
import Expansion from './Expansion'
import { NextRouter } from 'next/router'
import { reactSelectOptionStyle } from '../styleOverrides/reactSelect'
import { ExpandRequest } from '@/pages/api/valueset/codesearch'
import { getProgramManifestVersions } from '@/helpers/valueSetHelpers'
import { getVSConditions } from '@/helpers/libraryHelpers'
import { toast } from 'react-toastify'
import { debounce } from 'lodash'
import { apiFetch } from '@/utils'

interface Props {
  program: fhir4.Library
  router: NextRouter
}

interface MatchingCodes {
  system: string
  code: string
  version: string | undefined
  display: string | undefined
}

type MatchesFromServer = Record<string, MatchingCodes> | {}

interface Row {
  codeData: MatchingCodes
  leafData: {
    groupersBelongsTo: string[]
    leafDisplay: string
    url: string
  }
}

const customStyles = {
  rows: {
    style: {
      padding: '8px 12px'
    }
  },
  headCells: {
    style: {
      paddingLeft: '28px'
    }
  }
}

const convertToArrayForTable = (matchesData: MatchesFromServer) => {
  const allKeys = Object?.keys?.(matchesData) || []
  return allKeys?.map((key) => ({
    // @ts-ignore
    codeData: matchesData[key].codeData,
    // @ts-ignore
    leafData: matchesData[key].leafData
  }))
}

const CodeSearch = ({ program, router }: Props) => {
  // states for code search/$expand
  const [codeToFind, setCodeToFind] = useState<string | undefined>(undefined)
  const [systemToFind, setSystemToFind] = useState<string | undefined>(undefined)
  const [groupersToSearch, setGroupersToSearch] = useState<readonly fhir4.ValueSet[] | []>([])
  const [matchingValueSetUrls, setMatchingValueSetUrls] = useState<Row[] | null>(null)
  // loading states
  const [loadingCodeSearch, setLoadingCodeSearch] = useState(false)

  // error states
  const [error, setError] = useState<null | string>(null)

  const { programValuesets } = useGetProgramValueSetDetails({
    id: program.id!
  })

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const conditionsData = useMemo(() => {
    return getVSConditions(program)
  }, [[program]])

  const groupsInProgram = programValuesets?.groupsInProgram

  const handleClear = () => {
    setCodeToFind(undefined)
    setGroupersToSearch([])
    setSystemToFind(undefined)
    setMatchingValueSetUrls(null)
  }

  const handleSearchCodes = useCallback(
    debounce(
      async () => {
        setError(null)
        setLoadingCodeSearch(true)
        try {
          if (!groupersToSearch?.length) return
          const grouperIdsToSearch = groupersToSearch
            ?.map((i) => i?.id)
            ?.filter((x) => !!x)
            ?.map((x) => x!)

          const body: ExpandRequest['body'] = {
            codeSystem: systemToFind,
            groupersToSearch: grouperIdsToSearch,
            codeToFind,
            expansionParameters: getProgramManifestVersions(program)
          }

          const matches = await apiFetch('/api/valueset/codesearch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }).then((res) => res.json())

          if (matches.error) {
            // handle error & return
          }
          const matchesData = convertToArrayForTable(matches)
          setMatchingValueSetUrls(matchesData)
          setError(null)
        } catch (e) {
          setError('Error occurred searching for code')
        }
        setLoadingCodeSearch(false)
      },
      800,
      { leading: true, trailing: false }
    ),
    [groupersToSearch, systemToFind]
  )

  const matchColumns = useMemo(
    () => [
      {
        name: 'System',
        id: 'vs-code-system',
        selector: (row: Row) => row.codeData.system!,
        sortable: false,
        maxWidth: '180px',
        wrap: true
      },
      {
        name: 'Code',
        id: 'vs-code',
        selector: (row: Row) => row.codeData.code!,
        sortable: false,
        maxWidth: '160px',
        wrap: true
      },
      {
        name: 'Code System Version',
        id: 'vs-code-system-version',
        selector: (row: Row) => row?.codeData?.version!,
        sortable: false,
        maxWidth: '260px',
        wrap: true
      },
      {
        name: 'Display',
        id: 'vs-code-system-version',
        selector: (row: Row) => {
          return row?.codeData?.display!
        },
        sortable: false,
        maxWidth: '320px',
        wrap: true
      }
    ],
    [router, groupsInProgram, matchingValueSetUrls]
  )

  return (
    <div>
      <PageTitle style={{ marginBottom: '2rem' }}>Find Codes in Program {program.id}</PageTitle>
      <FormControl style={{ marginBottom: '24px', marginTop: '1.5rem', width: '100%' }}>
        {/* <FormGroup>
          <FormControlLabel label='Search for VSM Provisional Codes in this Program' control={<Checkbox/>}/>
        </FormGroup> */}
        <PageP>Find ValueSets in this program that...</PageP>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <PageP>Contain this code:</PageP>
            <SearchInput
              onChange={(e) => {
                setCodeToFind(e.target.value)
              }}
              value={codeToFind || ''}
              required
              errorMessage={!codeToFind ? 'Required' : ''}
              label="Code"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PageP>In System (optional):</PageP>
            <SearchInput
              onChange={(e) => {
                setSystemToFind(e.target.value)
              }}
              label="System"
              value={systemToFind || ''}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PageP>In Grouper(s):</PageP>
            <Select
              required={true}
              onChange={(e) => {
                setGroupersToSearch(e)
              }}
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
        <Grid container justifyContent="flex-end" spacing={2} xs={12} style={{ marginTop: '24px' }}>
          <Button
            text="Search"
            onClick={handleSearchCodes}
            style={{ marginRight: '8px' }}
            disabled={loadingCodeSearch || !codeToFind || !groupersToSearch.length}
            loading={loadingCodeSearch}
          />
          <Button text="Clear" onClick={handleClear} />
          <Grid container justifyContent="flex-end" xs={12} style={{ marginTop: '12px' }}>
            {(!groupersToSearch?.length || !codeToFind) && <FormErrorText>Code and grouper(s) required to search</FormErrorText>}
          </Grid>
        </Grid>
      </FormControl>
      {matchingValueSetUrls && (
        <DT
          customStyles={customStyles}
          title={
            loadingCodeSearch
              ? ''
              : `${matchingValueSetUrls.length} matching code${matchingValueSetUrls.length !== 1 ? 's' : ''} found in program:`
          }
          theme="aphl"
          data={matchingValueSetUrls || []}
          progressPending={loadingCodeSearch}
          columns={matchColumns}
          expandableRows
          expandableRowExpanded={() => true}
          // @ts-ignore-next-line (I can't figure this one out)
          expandableRowsComponent={Expansion}
          expandableRowsComponentProps={{ groupsInProgram: groupsInProgram, conditionsData }}
        />
      )}
    </div>
  )
}

export default CodeSearch
