import styled from 'styled-components'
import Link from 'next/link'
import { useRouter } from 'next/router'

const BarWrapper = styled.nav`
  margin-bottom: 24px;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  height: 60px;
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

const NavItem = styled.li`
  padding: 8px 12px;
  border-bottom: 3px solid transparent;

  &.active {
    border-bottom: 3px solid var(--theme-color);
  }

  &:hover {
    background-color: var(--white);
    border-bottom: 3px solid var(--theme-color);
    cursor: pointer;
  }
`

const StyledA = styled.a`
`

const StyledLink = styled(Link)`
  ${StyledA}.active & {
    background-color: blue;
    color: blue;
    text-transform: uppercase;
  }
`

const items = [
  {
    title: 'Programs',
    href: '/programs'
  },
  {
    title: 'Program Compare',
    href: '/programs/compare',
  },
  {
    title: 'ValueSet Search',
    href: '/valuesets'
  },
  {
    title: 'ValueSet Compare',
    href: '/valuesets/compare'
  }
]

const NavBar = () => {
  const router = useRouter()
  console.log(router.pathname)
  const navItems = items.map(i => (
    <NavItem className={router.pathname == i.href ? 'active' : ''} key={i.href}>
      <StyledLink href={i.href}>
        <StyledA>{i.title}</StyledA>
      </StyledLink>
    </NavItem>
  ))
  
  return (
    <BarWrapper>
      <Bar>
        { navItems }
      </Bar>
    </BarWrapper>
  )
}

export { NavBar }