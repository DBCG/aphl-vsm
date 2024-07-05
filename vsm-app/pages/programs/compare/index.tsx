import DiffViewerComponent from '@/components/DiffViewer/DiffViewerComponent'
import { useGetPrograms } from '@/hooks/useGetPrograms'
import { IconButton } from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import Select from 'react-select'
import styled from 'styled-components'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { createTableData } from '@/components/DiffViewer/createTables'
import Link from 'next/link'

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
`

const Li = styled.li`
  margin-bottom: .5rem;
  padding-left: 16px;
  &:hover,
  &:focus {
    color: palevioletred;
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
  console.log('menudata: ', menuData)
  if (!menuData) return

  const grouperItems = menuData.anchorLinkData.map((i, idx) => {
    if (idx === 0) {
      return (
        <a onClick={() => setMenuOpen(false)} href={`${router.pathname}#${i.rootLibId}`}>
          <Li>Root Library Metadata</Li>
        </a>
      )
    } else {
      return (
        <Ul>
          <a onClick={() => setMenuOpen(false)} href={`${router.pathname}#${i.grouperId}`}>
            <Li>{`${menuData.grouperPages[idx - 1].metadata.title} Metadata`}</Li>
          </a>
          <Ul>
            <a onClick={() => setMenuOpen(false)} href={`${router.pathname}#${i.vsTableId}`}>
              <Li>Value Sets</Li>
            </a>
            <a onClick={() => setMenuOpen(false)} href={`${router.pathname}#${i.codesTableId}`}>
              <Li>Codes</Li>
            </a>

          </Ul>
        </Ul>
      )

    }
  }
)

  return (
    <MenuContainer
      isOpen={isOpen}
      menuVisible={menuVisible}
    >
      <ButtonContainer style={{ marginRight: '-30px'}}>
        <IconButton
          onClick={() => {
            console.log('clicked')
            setMenuOpen((s) => !s)
          }}
          aria-label="menu-open-close"
        >
          <ArrowForwardIcon style={{ transform: isOpen ? 'rotate(180deg)' : 'none'}}/>
        </IconButton>
      </ButtonContainer>
      <Ul>
      {grouperItems}
    </Ul>
    </MenuContainer>
  )
}

const ProgramCompare = () => {
  const router = useRouter()
  const { selectedBase, selectedTarget } = router.query
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [baseProgram, setBaseProgram] = useState(selectedBase || null)
  const [targetProgram, setTargetProgram] = useState(selectedTarget || null)
  const [diffData, setDiffData] = useState(null)

  const allPrograms = useGetPrograms([]) || []


  if (!router) return

  const formattedProgramOptions = allPrograms.map(p => {
    return ({
      label: `Title: ${(p.title || p.name)}, ID: ${p.id}`,
      value: p.id
    })
  })

  const handleGenerateDifference = async () => {
    setIsLoadingDiff(true)
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
      console.log('not ok')
      // handle error
    } else {
      console.log('response: ', response)
      const json = await response.json()
      console.log('json: ', json)
      const formattedChangelog = createTableData(json)
      setDiffData(formattedChangelog)
    }
    setIsLoadingDiff(false)
    console.log('response: ', response)
  }

  return (
    <RelativeContainer>
      <DiffViewerMenu isOpen={menuOpen} setMenuOpen={setMenuOpen} menuVisible={diffData} menuData={diffData} router={router} />
      <ProgramContainer>
        <ProgramCol>
          <StyledP>Select base program</StyledP>
          <Select
            options={formattedProgramOptions}
            onChange={(i) => setBaseProgram(i)}
          />
        </ProgramCol>
        <ProgramCol>
          <StyledP>Select target program</StyledP>
          <Select
            // options={formattedProgramOptions}
            onChange={(i) => setTargetProgram(i)}
            options={formattedProgramOptions}
          />
        </ProgramCol>
      </ProgramContainer>
      <ButtonContainer>
        <Button
          text='Generate Difference'
          style={{ marginBottom: '2rem', marginTop: '1rem' }}
          onClick={handleGenerateDifference}
          loading={isLoadingDiff}
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