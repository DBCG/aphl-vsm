import styled from 'styled-components'

const BarWrapper = styled.nav`
  margin-bottom: 24px;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  min-height: 60px;
  width: 100%;
`

const Bar = styled.ol`
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex: 1;
  width: 100%;
  column-gap: 24px;
`

const NavBar = () => {
  return (
    <BarWrapper>
      <Bar>
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }