import DiffViewerComponent from '@/components/DiffViewer/DiffViewerComponent'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { CircularProgress, Drawer, IconButton, Tooltip } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { useRouter } from 'next/router'
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import Select from 'react-select'
import styled from 'styled-components'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WarningIcon from '@mui/icons-material/Warning'
import DownloadIcon from '@mui/icons-material/Download'
import DifferenceIcon from '@mui/icons-material/Difference'
import { createTableData } from '@/helpers/createTables'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import CloseIcon from '@mui/icons-material/Close'
import { toast } from 'react-toastify'
import { ChangelogData } from '@/components/DiffViewer/DiffViewerTypes'
import NotificationStore from '@/store/NotificationStore'
import { JOB_STATUS, JOB_TYPE } from '@/constants'
import { JobData } from '@/types/jobTypes'
import { Job } from 'bull'
import { apiFetch } from '@/utils'

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

const ProgramContainer = styled.div`
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

const ProgramCol = styled(ProgramContainer)`
  flex-direction: column;
`

const closedLeftPx = 490
const openLeftPx = 72

const MenuContainer = styled.div<{ isOpen: boolean; menuVisible: boolean }>`
  position: fixed;
  display: ${(props) => (props.menuVisible ? `inherit;` : `none;`)};
  height: calc(100% + 200px);
  width: 500px;
  background-color: rgba(255, 255, 255, 1);
  top: -96px;
  left: ${(props) => (props.isOpen ? `-${openLeftPx}px` : `-${closedLeftPx}px`)};
  z-index: 10000;
  transition: left ease 0.3s;
  padding: 2rem 2rem;
  font-size: 80%;
  top: -50px;
  box-shadow: 7.4px 14.9px 14.9px hsl(0deg 0% 0% / 0.27);
  cursor: pointer;
`

const Li = styled.li`
  margin-bottom: 0.5rem;
  padding-left: 16px;
  &:hover,
  &:focus {
    color: var(--theme-400);
  }
  &:before {
    content: url('/public/images/MenuIndent.svg');
    position: absolute;
  }
`

const Ul = styled.ul`
  margin-bottom: 1rem;
  padding-right: 2rem;
  list-style-type: none;
  padding-left: 0;
  margin-left: 20px;
`

interface MenuProps {
  menuData: ChangelogData
  isOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>
  menuVisible: boolean
  router: any
}

const DiffViewerMenu = ({ menuData, isOpen, setMenuOpen, menuVisible, router }: MenuProps) => {
  if (!menuData) return

  const grouperItems = menuData.anchorLinkData.map((i, idx) => {
    if (idx === 0) {
      return (
        <a key="root-lib" onClick={() => setMenuOpen(false)} href={`${router.asPath.split('#')[0]}#program-metadata`}>
          <Li style={{ marginTop: '2rem', marginBottom: '2rem' }}>Root Library Metadata</Li>
        </a>
      )
    } else if ('grouperId' in i) {
      return (
        <Ul key={i.grouperId}>
          <a onClick={() => setMenuOpen(false)} href={`${router.asPath.split('#')[0]}#${i.grouperId}`}>
            <div style={{ display: 'flex' }}>
              <Li style={{ display: 'flex', flexGrow: 1 }}>{`${menuData.grouperPages[idx - 1].metadata.title} Metadata`}</Li>
              {i.hasChange === 'updated' && (
                <Tooltip title="This grouper was updated">
                  <IconButton>
                    <WarningIcon style={{ color: 'var(--caution)' }} fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {i.hasChange === 'added' && (
                <Tooltip title="This grouper was added">
                  <IconButton>
                    <AddCircleIcon style={{ color: 'var(--added)' }} fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {i.hasChange === 'deleted' && (
                <Tooltip title="This grouper was deleted">
                  <IconButton>
                    <DeleteForeverIcon style={{ color: 'var(--removed)' }} fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </a>
          <Ul>
            <a
              onClick={() => {
                setMenuOpen(false)
                return false
              }}
              href={`${router.asPath.split('#')[0]}#${i.vsTableId}`}
            >
              <Li>Value Sets</Li>
            </a>
            <a
              onClick={() => {
                setMenuOpen(false)
                return false
              }}
              href={`${router.asPath.split('#')[0]}#${i.codesTableId}`}
            >
              <Li>Codes</Li>
            </a>
          </Ul>
        </Ul>
      )
    }
  })

  const handleClose = () => setMenuOpen(false)

  return (
    <MenuContainer
      title="Menu"
      isOpen={isOpen}
      menuVisible={menuVisible}
      onClick={(e) => {
        if (!isOpen) {
          setMenuOpen((s) => !s)
        }
      }}
    >
      <ButtonContainer style={{ marginRight: '-30px' }}>
        <IconButton
          onClick={(e) => {
            setMenuOpen((s) => !s)
            e.stopPropagation()
          }}
          aria-label="menu-open-close"
        >
          <ArrowForwardIcon style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
      </ButtonContainer>
      <Drawer variant="temporary" open={isOpen} onClose={handleClose}>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500]
          }}
        >
          <CloseIcon />
        </IconButton>
        <Ul>{grouperItems}</Ul>
      </Drawer>
    </MenuContainer>
  )
}

interface InitialProgram {
  value: string
  label: string
}

interface HandleGenerateDifferenceProps {
  base?: undefined | InitialProgram
  target?: undefined | InitialProgram
}

interface ChangelogItem {
  [key: string]: object
}

type ChangelogItemMap = Record<string, ChangelogItem>

// Used to guard against two concurrent loadDiffResults calls for the same
// base/target pair both kicking off a changelog request before either has a job id to
// de-dupe against.
const inFlightChangelogs = new Set<string>()

const ProgramCompare = () => {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState<boolean>(false)
  const [isLoadingDiff, setIsLoadingDiff] = useState(true)
  const [isError, setIsError] = useState(false)
  const [baseProgram, setBaseProgram] = useState<{ value: string; label: string } | null>(null)
  const [targetProgram, setTargetProgram] = useState<{ value: string; label: string } | null>(null)
  const [rawDiffData, setRawDiffData] = useState<ChangelogItemMap>({})
  const [diffViewerFormattedData, setDiffViewerFormattedData] = useState<ChangelogData | null>(null)

  // is it just diff viewer, or also download
  const [downloadLoading, setDownloadLoading] = useState(false)

  // cleanup function for the most recent NotificationStore.listenForJob subscription
  const listenForJobCleanupRef = useRef<(() => void) | null>(null)

  // @ts-ignore
  const allPrograms = useGetPrograms([]) || []

  const formattedProgramOptions = useMemo(
    () =>
      allPrograms.map((p) => {
        return {
          label: `Title: ${p.title || p.name}, ID: ${p.id}`,
          value: p.id as string
        }
      }),
    [allPrograms]
  )

  const getRawDiffData = async ({ base: initialBase = undefined, target: initialTarget = undefined }: HandleGenerateDifferenceProps) => {
    const base = initialBase || baseProgram
    const target = initialTarget || targetProgram

    if (!base || !target) {
      return
    }

    try {
      const response = await apiFetch('/api/programs/changelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseProgramId: base.value,
          targetProgramId: target.value
        })
      })
      if (!response.ok) {
        setDownloadLoading(false)
        setIsLoadingDiff(false)
        const errorMsg = await response.json()
        return { error: 'Failed to generate difference data: ' + errorMsg }
      } else {
        const json = await response.json()
        if (json?.finishedOn == null) {
          NotificationStore.addJob({ jobId: json.id, jobType: JOB_TYPE.CHANGE_LOG })
          return json // still in progress
        }

        // Note: `json` here is the raw Bull Job envelope, not the parsed changelog data
        // (that only exists once JSON.parse(json.returnvalue) runs in setDiffResults).
        // Don't write it into rawDiffData - that's reserved for the actual parsed changelog.
        return json
      }
    } catch (e) {
      return { error: `Failed to generate difference data between base (ID: ${base.value}) and target (ID: ${target.value})` }
    }
  }

  const handleGenerateDifference = async () => {
    if (!baseProgram || !targetProgram) {
      toast.error('Please select a base and target program')
      return
    }

    const existingData = rawDiffData?.[baseProgram.value]?.[targetProgram.value]

    if (existingData) {
      // use existing data if it's there, but still need to build the viewer's
      // formatted data since it may have been cleared by a dropdown change
      // @ts-ignore
      const formattedChangelog = createTableData(existingData)
      // @ts-ignore
      setDiffViewerFormattedData(formattedChangelog)
      setIsLoadingDiff(false)
      toast.success('Using existing difference data')
      
      return
    } else {
      loadDiffResults(baseProgram, targetProgram) 
    }
  }

  const handleDownload = async (base: string | undefined, target: string | undefined, rawData: any) => {
    if (!base || !target) {
      toast.error('Missing value for base or target program')
      return
    }
    if (!rawData || rawData.error) {
      toast.error('Missing changelog data for download')
      return
    }
    setDownloadLoading(true)

    try {
      const res = await apiFetch(`/api/programs/${base}/compare?targetId=${target}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawData)
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compare-${base}-${target}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        setDownloadLoading(false)
        toast.success(`File ${a.download} downloaded successfully`, { position: 'bottom-right' })
      } else {
        toast.error('Failed to download file')
        setDownloadLoading(false)
      }
    } catch (error) {
      toast.error('Failed to download comparison file')
      setDownloadLoading(false)
    }
  }

  const loadDiffResults = async (base: any, target: any) => {
    if (base?.value && target?.value) {
      const pairKey = `${base.value}:${target.value}`
      if (inFlightChangelogs.has(pairKey)) {
        // Already generating/listening for this exact pair
        return
      }
      inFlightChangelogs.add(pairKey)

      const diffResponse = await getRawDiffData({ base, target })
      if (diffResponse?.error) {
        toast.error(
          `Error encountered while generating difference data between base program ${base.value} and target program ${target.value}`
        )
        setDownloadLoading(false)
        setIsLoadingDiff(false)
        inFlightChangelogs.delete(pairKey)
        return
      } else if (diffResponse != null && diffResponse.finishedOn == null) {
        // if create-changelog is still in progress...
        toast.info('Difference data is being generated.')

        listenForJobCleanupRef.current = NotificationStore.listenForJob(diffResponse.id, async (job: JobData) => {
          if (job?.status === JOB_STATUS.COMPLETED) {
            toast.success('Difference generated successfully')
            const diffResponse = await getRawDiffData({ base, target }) // get the data again
            setDiffResults(base, target, diffResponse)
            setDownloadLoading(false)
            setIsLoadingDiff(false)
          } else if (job?.status === JOB_STATUS.FAILED) {
            toast.error('Error encountered while generating difference data between base program and target program')
            setDownloadLoading(false)
            setIsLoadingDiff(false)
            setIsError(true)
          }
          inFlightChangelogs.delete(pairKey)
        })
        return
      }

      setDiffResults(base, target, diffResponse)
      inFlightChangelogs.delete(pairKey)
    }
  }

  const setDiffResults = (base: any, target: any, diffResponse: Job) => {
    // early return if there's an error
    if (diffResponse?.returnvalue?.error) {
      setDownloadLoading(false)
      setIsLoadingDiff(false)
      return
    }

    const differenceData = JSON.parse(diffResponse?.returnvalue)

    const diffDataByParents = {
      [base!.value]: {
        [target!.value]: differenceData
      }
    }

    setRawDiffData(diffDataByParents)
    const formattedChangelog = createTableData(differenceData)
    // @ts-ignore
    setDiffViewerFormattedData(formattedChangelog)
    setDownloadLoading(false)
    setIsLoadingDiff(false)
  }

  // this runs on page load
  useEffect(() => {
    if (formattedProgramOptions?.length > 0) {
      const base = formattedProgramOptions?.find((p) => p.value === router.query.old)
      const target = formattedProgramOptions?.find((p) => p.value === router.query.new)
      setBaseProgram(base!)
      setTargetProgram(target!)
      loadDiffResults(base, target)
    }
    return () => {
      listenForJobCleanupRef.current?.()
      listenForJobCleanupRef.current = null
    }
  }, [formattedProgramOptions])

  useEffect(() => {
    if (targetProgram && baseProgram && targetProgram?.value! === baseProgram?.value) {
      toast.error('Please select two different programs to compare')
    }
  })

  const submitDisabled = useMemo(() => {
    return Boolean(
      (targetProgram && baseProgram && targetProgram?.value === baseProgram?.value) || isLoadingDiff || downloadLoading || isError
    )
  }, [targetProgram, baseProgram, isLoadingDiff, downloadLoading, isError])

  const optionsDisabled = useMemo(() => {
    return Boolean(isLoadingDiff || downloadLoading)
  }, [targetProgram, baseProgram, isLoadingDiff, downloadLoading])

  const diffStatusText = useMemo(() => {
    const messageParts = []
    if (isLoadingDiff) {
      messageParts.push('Loading Difference Viewer')
    }
    if (downloadLoading) {
      messageParts.push('Downloading Spreadsheet')
    }

    if (messageParts.length) {
      return `Status: ${messageParts.join(' and ')}`
    } else {
      return null
    }
  }, [isLoadingDiff, downloadLoading])

  return (
    <RelativeContainer>
      {/*  @ts-ignore */}
      <DiffViewerMenu
        isOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuVisible={Boolean(diffViewerFormattedData)}
        menuData={diffViewerFormattedData!}
        router={router}
      />
      <ProgramContainer style={{ marginBottom: '1rem' }}>
        <NoteContainer>
          {diffStatusText ? (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '.4rem' }}>
              <CircularProgress style={{ marginRight: '.6rem' }} size="1rem" />
              <NoteStatus>{diffStatusText}</NoteStatus>
            </div>
          ) : null}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 'fit-content' }}>
              <NoteParagraph>For larger programs, it can take around 30 minutes to generate difference data.</NoteParagraph>
              <NoteParagraph>You can navigate away from this page.</NoteParagraph>
              <NoteParagraph>Upon success or failure you will receive a notification in the top navbar.</NoteParagraph>
              <ProgramCol style={{ minWidth: '300px', maxWidth: '600px' }}>
                <StyledP>Select base program</StyledP>
                <Select
                  isDisabled={optionsDisabled}
                  options={formattedProgramOptions}
                  onChange={(i) => {
                    setBaseProgram(i)
                    setDiffViewerFormattedData(null)
                  }}
                  value={baseProgram}
                />
              </ProgramCol>
              <ProgramCol style={{ minWidth: '300px', maxWidth: '600px' }}>
                <StyledP>Select target program</StyledP>
                <Select
                  isDisabled={optionsDisabled}
                  onChange={(i) => {
                    setTargetProgram(i)
                    setDiffViewerFormattedData(null)
                  }}
                  options={formattedProgramOptions}
                  value={targetProgram}
                />
              </ProgramCol>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: 'fit-content' }}>
              <ButtonContainer style={{ alignItems: 'flex-end' }}>
                <LoadingButton
                  variant="text"
                  onClick={async () => {
                    setDownloadLoading(true)
                    // @ts-ignore
                    const downloadData = rawDiffData?.[baseProgram.value]?.[targetProgram.value]
                    await handleDownload(baseProgram?.value, targetProgram?.value, downloadData)
                  }}
                  loading={downloadLoading}
                  disabled={submitDisabled}
                  loadingPosition="start"
                  startIcon={<DownloadIcon />}
                >
                  Download Spreadsheet
                </LoadingButton>
              </ButtonContainer>
            </div>
          </div>
          <ProgramCol style={{ maxWidth: 'fit-content', width: '100%', alignSelf: 'flex-end' }}>
            <div style={{ backgroundColor: 'white', padding: '.8rem .6rem' }}>
              <ButtonContainer style={{ alignItems: 'flex-end', margin: '1rem 0' }}>
                <LoadingButton
                  onClick={async () => {
                    setIsLoadingDiff(true)
                    await handleGenerateDifference()
                  }}
                  loading={isLoadingDiff}
                  loadingPosition="start"
                  disabled={submitDisabled}
                  startIcon={<DifferenceIcon />}
                  variant="contained"
                >
                  Generate Differences
                </LoadingButton>
              </ButtonContainer>
            </div>
          </ProgramCol>
          {isError && (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'flex-start' }}>
              <WarningIcon style={{ color: 'var(--accent)', marginRight: '1rem' }} />
              <p style={{ color: 'var(--accent)', lineHeight: '150%'  }}>
                Error encountered while generating difference data.<br></br>See notification in navbar for details.
              </p>
            </div>
          )}
        </NoteContainer>
      </ProgramContainer>
      {diffViewerFormattedData && <DiffViewerComponent changelogData={diffViewerFormattedData} />}
    </RelativeContainer>
  )
}

export default ProgramCompare
