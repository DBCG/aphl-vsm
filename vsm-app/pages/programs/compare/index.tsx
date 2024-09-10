import DiffViewerComponent from '@/components/DiffViewer/DiffViewerComponent'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { CircularProgress, Drawer, IconButton, Tooltip } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { useRouter } from 'next/router'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import styled from 'styled-components'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WarningIcon from '@mui/icons-material/Warning'
import { createTableData } from '@/helpers/createTables'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import CloseIcon from '@mui/icons-material/Close'
import { toast } from 'react-toastify'
import { ChangelogData } from '@/components/DiffViewer/DiffViewerTypes'

const RelativeContainer = styled.div`
  position: relative;
`

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`

const StyledP = styled.p`
  margin-bottom: .5rem;
`

const ProgramContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  // gap: 1rem;
`

const NoteContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  width: 100%;
  background-color: white;
  transition: height .3s;
`

const NoteParagraph = styled.i`
  margin-block-start: .2rem;
  margin-block-end: .2rem;
`

const NoteStatus = styled.p`
  font-weight: bold;
  // margin-block-start: .2rem;
  // margin-block-end: .6rem;
`

const ProgramCol = styled(ProgramContainer)`
  flex-direction: column;
`

const closedLeftPx = 490
const openLeftPx = 72

const MenuContainer = styled.div<{ isOpen: boolean, menuVisible: boolean }>`
  position: fixed;
  display: ${props => props.menuVisible ? `inherit;` : `none;`};
  height: calc(100% + 200px);
  width: 500px;
  background-color: rgba(255,255,255,1);
  top: -96px;
  left: ${props => props.isOpen ? `-${openLeftPx}px` : `-${closedLeftPx}px`};
  z-index: 10000;
  transition: left ease .3s;
  padding: 2rem 2rem;
  font-size: 80%;
  top: -50px;
  box-shadow: 7.4px 14.9px 14.9px hsl(0deg 0% 0% / 0.27);
  cursor: pointer;
`

const Li = styled.li`
  margin-bottom: .5rem;
  padding-left: 16px;
  &:hover,
  &:focus {
    color: var(--theme-400);
  };
  &:before {
    content: url("/public/images/MenuIndent.svg");
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
        <a key='root-lib' onClick={() => setMenuOpen(false)} href={`${router.asPath.split('#')[0]}#program-metadata`}>
          <Li style={{ marginTop: '2rem', marginBottom: '2rem' }}>Root Library Metadata</Li>
        </a>
      )
    } else if ('grouperId' in i) {
      return (
        <Ul key={i.grouperId}>
          <a onClick={() => setMenuOpen(false)} href={`${router.asPath.split('#')[0]}#${i.grouperId}`}>
            <div style={{ display: 'flex' }}>
              <Li style={{ display: 'flex', flexGrow: 1 }}>{`${menuData.grouperPages[idx - 1].metadata.title} Metadata`}</Li>
              { i.hasChange === 'updated' && (
                <Tooltip title='This grouper was updated'>
                  <IconButton>
                    <WarningIcon style={{ color: 'var(--caution)' }} fontSize='small'/>
                  </IconButton>
                </Tooltip>
              )}
              { i.hasChange === 'added' && (
                <Tooltip title='This grouper was added'>
                  <IconButton>
                    <AddCircleIcon style={{ color: 'var(--added)' }} fontSize='small'/>
                  </IconButton>
                </Tooltip>
              )}
              { i.hasChange === 'deleted' && (
                <Tooltip title='This grouper was deleted'>
                  <IconButton>
                    <DeleteForeverIcon style={{ color: 'var(--removed)' }} fontSize='small'/>
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
              href={`${router.asPath.split('#')[0]}#${i.vsTableId}`}>
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
  }
)

  const handleClose = () => setMenuOpen(false)

  return (
    <MenuContainer
      title='Menu'
      isOpen={isOpen}
      menuVisible={menuVisible}
      onClick={(e) => {
        if(!isOpen) {
          setMenuOpen((s) => !s)
        }
      }}
    >
      <ButtonContainer style={{ marginRight: '-30px'}}>
        <IconButton
          onClick={(e) => {
            setMenuOpen((s) => !s)
            e.stopPropagation()
          }}
          aria-label="menu-open-close"
        >
          <ArrowForwardIcon style={{ transform: isOpen ? 'rotate(180deg)' : 'none'}}/>
        </IconButton>
      </ButtonContainer>
      <Drawer variant='temporary' open={isOpen} onClose={handleClose}>
      <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <Ul>
          {grouperItems}
        </Ul>
    </Drawer>
    </MenuContainer>

  )
}

interface InitialProgram {
  value: string
  label: string
}

interface HandleGenerateDifferenceProps {
  base?: undefined | InitialProgram,
  target?: undefined | InitialProgram,
  generateDiff: boolean 
}

const ProgramCompare = () => {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState<boolean>(false)
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [baseProgram, setBaseProgram] = useState<{value: string, label: string} | null>(null)
  const [targetProgram, setTargetProgram] = useState<{value: string, label: string} | null>(null)
  const [diffData, setDiffData] = useState<ChangelogData | null>(null)
  const [baseTouched, setBaseTouched] = useState(false)
  const [targetTouched, setTargetTouched] = useState(false)

  // is it just diff viewer, or also download
  const [downloadSelected, setDownloadSelected] = useState(false)
  const [viewDiff, setViewDiff] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)


  // @ts-ignore
  const allPrograms = useGetPrograms([]) || []

  const formattedProgramOptions = useMemo(() => allPrograms.map(p => {
    return ({
      label: `Title: ${(p.title || p.name)}, ID: ${p.id}`,
      value: p.id
    })
  }), [allPrograms])

  const handleGenerateDifference = async ({
    base: initialBase=undefined,
    target: initialTarget=undefined,
    generateDiff
  }: HandleGenerateDifferenceProps) => {

    console.log('generateDiff called with:')
    console.log('generateDiff', generateDiff)
    console.log('initialTarget ', initialTarget)
    console.log('initialBase ', initialBase)
    if (!generateDiff) return
    setIsLoadingDiff(true)
    setBaseTouched(true)
    setTargetTouched(true)

    const base = initialBase || baseProgram
    const target = initialTarget || targetProgram

    if (!base || !target) return
    const response = await fetch('/api/programs/changelog', {
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
      // handle error
    } else {
      const json = await response.json()
      const formattedChangelog = createTableData(json)
      // @ts-ignore
      setDiffData(formattedChangelog)
    }
    setIsLoadingDiff(false)
  }

  const handleDownload = async (base: string, target: string, download: boolean) => {
    if (!download) return
    if (!base || !target) {
      toast.error('Missing value for base or target program')
      return
    }
    setDownloadLoading(true)
    try {
      const res = await fetch(`/api/programs/${base}/compare?targetId=${target}`, {
        method: 'POST'
      })

      console.log('res', res)
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
      console.log('error', error)
      toast.error('Failed to download comparison file')
      setDownloadLoading(false)
    }
  }

  const allowFirstLoad = () => {
    if (
      router.query.old && router.query.new &&
      (!baseTouched && !targetTouched) &&
      (!isLoadingDiff && !downloadLoading) &&
      formattedProgramOptions?.length
    ) {
      return true
    }
    return false
  }

  // this runs on page load
  useEffect(() => {
    (async () => {
      console.log('this called')
      console.log('router.query', router.query)
      if (allowFirstLoad()) {
        console.log('loading')
        const base = formattedProgramOptions?.find(p => p.value === router.query.old)
        const target = formattedProgramOptions?.find(p => p.value === router.query.new)
        const download = router.query.downloadSpreadsheet === 'true'
        const seeDiff = router.query.showDiffViewer === 'true'
        console.log('seeDiff', seeDiff)
        console.log('base here', base)
        console.log('target here', target)
        if (base?.value && target?.value) {
          // @ts-ignore
          setBaseProgram(base)
          // @ts-ignore
          setTargetProgram(target)
          setDownloadSelected(download)
          setViewDiff(seeDiff)

          // run both async functions in parallel
          await Promise.all([
            handleGenerateDifference({ base, target, generateDiff: seeDiff }),
            handleDownload(base.value, target.value, download)
          ])
        }
      }
    })()
  }, [formattedProgramOptions, router])

  useEffect(() => {
    if (targetProgram && baseProgram && targetProgram?.value! === baseProgram?.value) {
      toast.error('Please select two different programs to compare')
    }
  })

  const submitDisabled = useMemo(() => {
    return Boolean(
      (targetProgram && baseProgram && targetProgram?.value === baseProgram?.value) ||
      isLoadingDiff || downloadLoading
    )
  }, [targetProgram, baseProgram, isLoadingDiff, downloadLoading])

  const optionsDisabled = useMemo(() => {
    return Boolean(
      isLoadingDiff || downloadLoading
    )
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
      <DiffViewerMenu isOpen={menuOpen} setMenuOpen={setMenuOpen} menuVisible={Boolean(diffData)} menuData={diffData} router={router} />
      <ProgramContainer style={{ marginBottom: '1rem' }}>
        <NoteContainer>
          { diffStatusText ? (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '.4rem' }}>
            <CircularProgress style={{ marginRight: '.6rem'}} size='1rem'/>
            <NoteStatus>
              {diffStatusText}
            </NoteStatus>
          </div>
          ) : null }
          <NoteParagraph>Generating differences may take a few minutes to process the data.</NoteParagraph>
          <NoteParagraph>Please wait until the action is complete before navigating away from this page.</NoteParagraph>
          <ProgramCol style={{ minWidth: '300px', maxWidth: '600px' }}>
          <StyledP>Select base program</StyledP>
          <Select
            isDisabled={optionsDisabled}
            // @ts-ignore
            options={formattedProgramOptions}
            onChange={(i) => {
              setBaseTouched(true)
              setBaseProgram(i)
            }}
            value={baseProgram}
          />
        </ProgramCol>
        <ProgramCol style={{ minWidth: '300px', maxWidth: '600px' }}>
          <StyledP>Select target program</StyledP>
          <Select
            isDisabled={optionsDisabled}
            onChange={(i) => {
              setTargetTouched(true)
              setTargetProgram(i)
            }}
            // @ts-ignore
            options={formattedProgramOptions}
            value={targetProgram}
          />
        </ProgramCol>
        <ProgramCol>
          <ButtonContainer style={{ height: '100%', alignItems: 'flex-end', margin: '1rem 0' }}>
            <Button
              text='Generate Difference'
              onClick={async () => {
                console.log('onclick called')
                await handleGenerateDifference({ generateDiff: true })
              }}
              loading={isLoadingDiff || downloadLoading}
              disabled={submitDisabled}
            />
          </ButtonContainer>
        </ProgramCol>
        </NoteContainer>

      </ProgramContainer>
      {diffData && (
        <DiffViewerComponent
          changelogData={diffData}
        />
      )}
    </RelativeContainer>
  )
}

export default ProgramCompare