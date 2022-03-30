import styled from 'styled-components'
import { useRouter } from 'next/router'
import Link from 'next/link'
import React from 'react'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`

const FileBody = styled.div`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.6);
  min-height: 500px;
  padding: 32px 36px;
  position: relative;
`

const TabContainer = styled.ol`
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex: 1;
  width: 100%;
  column-gap: 24px;
`

interface FileTabProps {
  num: number
}

const FileTab = styled.div<FileTabProps>`
  min-width: 192px;
  height: 54px;
  background-color: white;
  cursor: pointer;
  left: ${props => props.num === 0 ? 0 : props.num * 192 + 12}px;
  padding: 14px 40px;
  text-align: center;
  &.active {
    font-weight: bold;
    background-color: rgba(255, 255, 255, 0.6);
  }
`

const Span = styled.span`
  font-size: 18px;
  font-weight: regular;
  text-transform: capitalize;
  color: var(--theme-500);
`

const tabs = ['programs', 'value sets']

const GeneratedTabs = () => {
  const router = useRouter()
  const allTabs = tabs.map((t, index) => {
    const tabName = t.replace(' ', '').toLowerCase()
    return (
      <FileTab
        key={tabName}
        className={router.pathname.includes(tabName)? 'active' : ''} num={index}
        onClick={() => router.push(tabName)}
      >
        <Span>
          {t}
        </Span>
      </FileTab>
    )
  })
  return (
    <TabContainer>
      { allTabs }
    </TabContainer>
  )
}

interface FileContainerP  {
  children: React.ReactNode
}

const FileContainer = ({ children }: FileContainerP) => {

  return (
    <Container>
      <GeneratedTabs/>
      <FileBody>
        { children }
      </FileBody>
    </Container>
  )
}

export { FileContainer }