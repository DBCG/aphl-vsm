import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import styled from 'styled-components'

const NavList = styled.ul`
  display: flex;
  flex-direction: row;
  & > :last-child {
    font-weight: bold;
  }
`

const NavItem = styled.li`
  display: inline-block;
  list-style-type: none;
  background-color: white;
  text-transform: capitalize;
  font-weight: 400;
  padding: 8px 20px;
  background-color: rgba(192, 231, 235, 1);
  margin: auto;
  color: var(--theme-500);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%);
  &:hover {
    background-color: #ebdac0;
    cursor: pointer;
  }
`

const composePath = (pathItems: string[], lastOfPath: string) => {
  const idx = pathItems.indexOf(lastOfPath)
  return pathItems.slice(0, idx + lastOfPath.length)
}

const BreadCrumbs = () => {
  const [breadCrumbs, setBreadCrumbs] = useState([])
  const router = useRouter()

  useEffect(() => {
    if (router) {
      const crumbs = router.asPath.split('/')
      setBreadCrumbs(crumbs)
    } else {
      setBreadCrumbs([])
    }
  }, [router])

  if (!breadCrumbs.length) return null

  const items = breadCrumbs.map((c, index) => {
    if (c !== '') {
      return (
      <Link href={composePath(router.asPath, c)}>
        <NavItem alpha={index / 0.1} key={c}>
            {`${c}`} 
        </NavItem>
      </Link>
    )}
  })

  return (
    <NavList>
      {items}
    </NavList>
  )
}

export { BreadCrumbs }
