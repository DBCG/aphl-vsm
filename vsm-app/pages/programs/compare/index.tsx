import DiffViewerComponent from '@/components/DiffViewer/DiffViewerComponent'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { Drawer, IconButton, Tooltip } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import styled from 'styled-components'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WarningIcon from '@mui/icons-material/Warning'
import { createTableData } from '@/components/DiffViewer/createTables'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import CloseIcon from '@mui/icons-material/Close'
import { toast } from 'react-toastify'

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
  gap: 1rem;
`

const ProgramCol = styled(ProgramContainer)`
  flex-direction: column;
  min-width: 400px;
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

const DiffViewerMenu = ({ menuData, isOpen, setMenuOpen, menuVisible, router }) => {
  if (!menuData) return
  console.log('router: ', router)

  const grouperItems = menuData.anchorLinkData.map((i, idx) => {
    if (idx === 0) {
      return (
        <a onClick={() => setMenuOpen(false)} href={`${router.asPath.split('#')[0]}#${i.rootLibId}`}>
          <Li style={{ marginTop: '2rem'}}>Root Library Metadata</Li>
        </a>
      )
    } else {
      return (
        <Ul>
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
      isOpen={isOpen}
      menuVisible={menuVisible}
      onClick={(e) => {
        console.log('clicked')
        if(!isOpen) {
          setMenuOpen((s) => !s)
        }
      }}
    >
      <ButtonContainer style={{ marginRight: '-30px'}}>
        <IconButton
          onClick={(e) => {
            console.log('also clicked')
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

const ProgramCompare = () => {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [baseProgram, setBaseProgram] = useState(null)
  const [targetProgram, setTargetProgram] = useState(null)
  const [diffData, setDiffData] = useState(null)
  const [baseTouched, setBaseTouched] = useState(false)
  const [targetTouched, setTargetTouched] = useState(false)

  const allPrograms = useGetPrograms([]) || []

  if (!router) return

  const formattedProgramOptions = useMemo(() => allPrograms.map(p => {
    return ({
      label: `Title: ${(p.title || p.name)}, ID: ${p.id}`,
      value: p.id
    })
  }), [allPrograms])

  const handleGenerateDifference = async () => {
    setIsLoadingDiff(true)
    setBaseTouched(true)
    setTargetTouched(true)
    // handle error
    if (!baseProgram || !targetProgram) return
    const response = await fetch('/api/programs/changelog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        baseProgramId: baseProgram.value,
        targetProgramId: targetProgram.value
      })
    })

    if (!response.ok) {
      // handle error
    } else {
      const json = await response.json()
      const formattedChangelog = createTableData(json)
      setDiffData(formattedChangelog)
    }
    setIsLoadingDiff(false)
  }

  useEffect(() => {
    if (router.query.old && router.query.new && (!baseTouched && !targetTouched)) {
      setBaseProgram(formattedProgramOptions?.find(p => p.value === router.query.old))
      setTargetProgram(formattedProgramOptions?.find(p => p.value === router.query.new))
    }
  }, [formattedProgramOptions, router])

  useEffect(() => {
    if (targetProgram && baseProgram && targetProgram?.value! === baseProgram?.value) {
      toast.error('Please select two different programs to compare')
    }
  })

  return (
    <RelativeContainer>
      <DiffViewerMenu isOpen={menuOpen} setMenuOpen={setMenuOpen} menuVisible={diffData} menuData={diffData} router={router} />
      <ProgramContainer>
        <ProgramCol>
          <StyledP>Select base program</StyledP>
          <Select
            isDisabled={isLoadingDiff}
            options={formattedProgramOptions}
            onChange={(i) => {
              setBaseTouched(true)
              setBaseProgram(i)
            }}
            value={baseProgram}
          />
        </ProgramCol>
        <ProgramCol>
          <StyledP>Select target program</StyledP>
          <Select
            // options={formattedProgramOptions}
            isDisabled={isLoadingDiff}
            onChange={(i) => {
              setTargetTouched(true)
              setTargetProgram(i)
            }}
            options={formattedProgramOptions}
            value={targetProgram}
          />
        </ProgramCol>
      </ProgramContainer>
      <ButtonContainer>
        <Button
          text='Generate Difference'
          style={{ marginBottom: '2rem', marginTop: '1rem' }}
          onClick={handleGenerateDifference}
          loading={isLoadingDiff}
          disabled={(!targetProgram || !baseProgram) || (targetProgram && baseProgram && targetProgram?.value === baseProgram?.value)}
        />

      </ButtonContainer>
      {diffData && (
        <DiffViewerComponent
          changelogData={diffData}
        />
      )}
    </RelativeContainer>
  )
}

export default ProgramCompare