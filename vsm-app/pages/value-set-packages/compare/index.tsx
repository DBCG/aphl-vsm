import DiffViewerComponent from '@/components/DiffViewer/DiffViewerComponent'
import { CircularProgress, Tooltip } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import styled from 'styled-components'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import { toast } from 'react-toastify'
import { ChangelogData } from '@/components/DiffViewer/DiffViewerTypes'
import NotificationStore from '@/store/NotificationStore'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import useSWR from 'swr'

const RelativeContainer = styled.div`
  position: relative;
`

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`

const StyledP = styled.p`
  margin-bottom: 0.5rem;
`

const VSPContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const NoteContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  width: 100%;
  background-color: white;
  transition: height 0.3s;
`

const NoteParagraph = styled.i`
  margin-block-start: 0.2rem;
  margin-block-end: 0.2rem;
`

const NoteStatus = styled.p`
  font-weight: bold;
`

const VSPCol = styled(VSPContainer)`
  flex-direction: column;
`

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ComparePage = () => {
  const router = useRouter()
  const { source } = router.query

  const [loading, setLoading] = useState(false)
  const [sourceVSP, setSourceVSP] = useState<fhir4.Library | null>(null)
  const [targetVSP, setTargetVSP] = useState<fhir4.Library | null>(null)
  const [changelogData, setChangelogData] = useState<ChangelogData | null>(null)
  const [changelogJobId, setChangelogJobId] = useState<string | null>(null)

  // Fetch available VSP versions for comparison
  const { data: vspVersions } = useSWR(
    source ? `/api/value-set-packages/${source}/compare` : null,
    fetcher
  )

  // Fetch source VSP details
  useEffect(() => {
    if (source && typeof source === 'string') {
      fetch(`/api/value-set-packages/${source}`)
        .then((res) => res.json())
        .then((data) => {
          // API returns { vsp: ... } so extract the vsp object
          setSourceVSP(data.vsp || data)
        })
        .catch((err) => console.error('Error fetching source VSP:', err))
    }
  }, [source])

  // VSP options for dropdown
  const vspOptions = useMemo(() => {
    return (vspVersions || []).map((vsp: fhir4.Library) => ({
      value: vsp.id,
      label: `${vsp.title || vsp.id} (${vsp.version || 'No version'})`
    }))
  }, [vspVersions])

  const handleCompare = async (forceRerun = false) => {
    if (!sourceVSP || !targetVSP) {
      toast.error('Please select both source and target VSPs')
      return
    }

    console.log('Comparing:', { sourceVSP: sourceVSP.id, targetVSP: targetVSP.id, forceRerun })

    setLoading(true)
    setChangelogData(null)

    try {
      const requestBody = {
        baseProgramId: sourceVSP.id,
        targetProgramId: targetVSP.id,
        forceRerun
      }
      console.log('Sending changelog request:', requestBody)

      // Start changelog job
      const response = await fetch('/api/value-set-packages/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const job = await response.json()
      console.log('Changelog response:', { status: response.status, job })

      if (!response.ok) {
        throw new Error(job.error || `Server returned ${response.status}`)
      }

      if (!job || !job.id) {
        throw new Error('Invalid job response from server')
      }

      if (job.id) {
        setChangelogJobId(job.id.toString())

        // Add to notification store to track progress
        await NotificationStore.addJob({
          jobId: job.id.toString(),
          jobType: JOB_TYPE.CHANGE_LOG,
          metadata: {
            baseProgramId: sourceVSP.id,
            targetProgramId: targetVSP.id
          },
          onSuccess: async (result: any) => {
            console.log('Job completed, fetching result...')
            try {
              // Fetch the actual job result from the queue
              const resultResponse = await fetch(`/api/jobs/${job.id}/result`)

              if (!resultResponse.ok) {
                throw new Error(`Failed to fetch job result: ${resultResponse.status}`)
              }

              const jobResult = await resultResponse.json()

              console.log('Job result:', jobResult)
              console.log('Return value type:', jobResult.returnvalue?.resourceType)
              console.log('Return value parameters:', jobResult.returnvalue?.parameter?.length)

              if (jobResult.state === 'failed') {
                toast.error(`Comparison failed: ${jobResult.error || 'Unknown error'}`)
              } else if (jobResult.returnvalue) {
                setChangelogData(jobResult.returnvalue)
                toast.success('Comparison completed!')
              } else {
                console.warn('No return value in job result')
                toast.warning('Comparison completed but no differences found')
              }
            } catch (error) {
              console.error('Error fetching job result:', error)
              toast.error(`Error fetching comparison results: ${error.message}`)
            } finally {
              setLoading(false)
            }
          },
          onFailure: (error: string) => {
            console.error('Changelog failed:', error)
            toast.error(`Changelog generation failed: ${error}`)
            setLoading(false)
          }
        })

        // Check if job is already completed
        console.log('Checking if job already completed:', {
          finishedOn: job.finishedOn,
          hasReturnvalue: !!job.returnvalue,
          returnvalue: job.returnvalue
        })
        if (job.finishedOn) {
          console.log('Job already completed, fetching result...')
          try {
            const resultResponse = await fetch(`/api/jobs/${job.id}/result`)

            if (!resultResponse.ok) {
              throw new Error(`Failed to fetch job result: ${resultResponse.status}`)
            }

            const jobResult = await resultResponse.json()

            console.log('Job result from already completed job:', jobResult)
            console.log('Return value parameters:', jobResult.returnvalue?.parameter?.length)

            if (jobResult.state === 'failed') {
              toast.error(`Comparison failed: ${jobResult.error || 'Unknown error'}`)
            } else if (jobResult.returnvalue) {
              setChangelogData(jobResult.returnvalue)
              toast.success('Comparison completed!')
            } else {
              toast.warning('Comparison completed but no differences found')
            }
          } catch (error) {
            console.error('Error fetching job result:', error)
            toast.error(`Error fetching comparison results: ${error.message}`)
          }
          setLoading(false)
        }
      } else {
        throw new Error('No job ID returned')
      }
    } catch (error: any) {
      console.error('Error generating changelog:', error)
      toast.error(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!changelogData || !sourceVSP || !targetVSP) {
      toast.error('No changelog data available')
      return
    }

    try {
      const response = await fetch(
        `/api/value-set-packages/${sourceVSP.id}/compare?targetId=${targetVSP.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changelogData)
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'VSP_Comparison_Report.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Downloaded comparison report')
      } else {
        toast.error('Failed to download report')
      }
    } catch (error: any) {
      console.error('Error downloading report:', error)
      toast.error(`Download error: ${error.message}`)
    }
  }

  return (
    <RelativeContainer>
      <h1>Compare Value Set Package Versions</h1>

      <NoteContainer>
        <NoteParagraph>
          <NoteStatus>Note:</NoteStatus>
          Select two VSP versions to compare. The artifact-diff operation will analyze differences between them.
        </NoteParagraph>
      </NoteContainer>

      <VSPCol style={{ marginTop: '2rem', gap: '1rem' }}>
        <div>
          <StyledP>Source VSP:</StyledP>
          <Select
            options={[{ value: source, label: sourceVSP ? `${sourceVSP.title || sourceVSP.id} (${sourceVSP.version})` : source }]}
            value={{ value: source, label: sourceVSP ? `${sourceVSP.title || sourceVSP.id} (${sourceVSP.version})` : source }}
            isDisabled
          />
        </div>

        <ArrowForwardIcon style={{ alignSelf: 'center', transform: 'rotate(90deg)' }} />

        <div>
          <StyledP>Target VSP:</StyledP>
          <Select
            options={vspOptions}
            onChange={(option: any) => {
              const selected = vspVersions?.find((v: fhir4.Library) => v.id === option.value)
              setTargetVSP(selected || null)
            }}
            placeholder="Select target VSP..."
            isClearable
          />
        </div>
      </VSPCol>

      <ButtonContainer style={{ marginTop: '2rem', gap: '1rem' }}>
        <LoadingButton
          variant="contained"
          onClick={() => handleCompare(false)}
          loading={loading}
          disabled={!sourceVSP || !targetVSP || loading}
        >
          Generate Comparison
        </LoadingButton>

        {changelogData && !loading && (
          <>
            <Tooltip title="Clear results and re-run comparison">
              <LoadingButton
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => handleCompare(true)}
                disabled={loading}
              >
                Re-run Comparison
              </LoadingButton>
            </Tooltip>

            <Tooltip title="Download Excel report">
              <LoadingButton
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download Report
              </LoadingButton>
            </Tooltip>
          </>
        )}
      </ButtonContainer>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <CircularProgress />
          <p style={{ marginLeft: '1rem' }}>Generating comparison...</p>
        </div>
      )}

      {changelogData && !loading && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Comparison Results ({changelogData.parameter?.filter((p: any) => p.name === 'operation').length || 0} changes)</h2>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '8px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {changelogData.parameter && changelogData.parameter.length > 0 ? (
              changelogData.parameter.map((param: any, idx: number) => {
                if (param.name !== 'operation') return null

                // Helper to extract FHIR value[x] from a part
                const extractValue = (part: any): any => {
                  if (!part) return null
                  return part.valueId || part.valueString || part.valueCode || part.valueUri ||
                         part.valueBoolean || part.valueInteger || part.valueDecimal ||
                         part.valueDate || part.valueDateTime || part.valueCanonical ||
                         part.valueReference || part.valueCodeableConcept || null
                }

                // Extract operation details from parts
                const typePart = param.part?.find((p: any) => p.name === 'type')
                const pathPart = param.part?.find((p: any) => p.name === 'path')
                const previousValuePart = param.part?.find((p: any) => p.name === 'previousValue')
                const valuePart = param.part?.find((p: any) => p.name === 'value')

                const operationType = extractValue(typePart)
                const path = extractValue(pathPart)
                const previousValue = extractValue(previousValuePart)
                const newValue = extractValue(valuePart)

                return (
                  <div key={idx} style={{
                    marginBottom: '1rem',
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#1976d2' }}>Operation #{idx + 1}:</strong> {operationType}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#666', marginBottom: '0.5rem' }}>
                      <strong>Path:</strong> {path}
                    </div>
                    {previousValue && (
                      <div style={{ marginLeft: '1rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#d32f2f' }}>- Previous: </span>
                        <code style={{ backgroundColor: '#ffebee', padding: '2px 4px', borderRadius: '3px' }}>
                          {typeof previousValue === 'object' ? JSON.stringify(previousValue) : previousValue}
                        </code>
                      </div>
                    )}
                    {newValue && (
                      <div style={{ marginLeft: '1rem' }}>
                        <span style={{ color: '#388e3c' }}>+ New: </span>
                        <code style={{ backgroundColor: '#e8f5e9', padding: '2px 4px', borderRadius: '3px' }}>
                          {typeof newValue === 'object' ? JSON.stringify(newValue) : newValue}
                        </code>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <p>No differences found between the selected VSP versions.</p>
            )}
          </div>
        </div>
      )}
    </RelativeContainer>
  )
}

export default ComparePage
