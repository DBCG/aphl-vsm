import styled from 'styled-components'
import Link from 'next/link'

const BarWrapper = styled.nav`
  margin-bottom: 24px;
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
  border-bottom: 3px solid var(--theme-color);
  &:hover {
    background-color: var(--white);
    cursor: pointer;
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
  const navItems = items.map(i => (
    <NavItem key={i.href}>
      <Link href={i.href}>
        {i.title}
      </Link>
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