import styled from 'styled-components'
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
  backdrop-filter: blur(8px);
`

interface FileContainerProps {
  children: React.ReactNode
}

const FileContainer = ({ children }: FileContainerProps) => {
  return (
    <Container>
      <FileBody>{children}</FileBody>
    </Container>
  )
}

export { FileContainer }
