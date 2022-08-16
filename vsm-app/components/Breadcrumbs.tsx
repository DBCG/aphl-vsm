import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import styled from 'styled-components'

const NavList = styled.ul`
  display: flex;
  flex-direction: row;
`

const NavItem = styled.li`
  list-style-type: none;
  margin: 4px;
  padding: 3px;
  background-color: white;
`

const composePath = (pathItems: string[], lastOfPath: string) => {
  console.log('test')
  const idx = pathItems.indexOf(lastOfPath)
  console.log('pathitems: ', pathItems)
  return pathItems.slice(0, idx + lastOfPath.length)
}

const BreadCrumbs = () => {
  const [breadCrumbs, setBreadCrumbs] = useState([])
  const router = useRouter()

  useEffect(() => {
    if (router) {
      const crumbs = router.asPath.split('/')
      console.log('crumbs: ', crumbs)
      setBreadCrumbs(crumbs)
    } else {
      setBreadCrumbs([])
    }
  }, [router])

  if (!breadCrumbs.length) return null

  const items = breadCrumbs.map(c => {
    if (c !== '') {
      return (
      <NavItem key={c}>
        <Link href={composePath(router.asPath, c)}>
          {`${c}`} 
        </Link>
      </NavItem>
    )
    }
})

  return (
    <NavList>
      {items}
    </NavList>
  )
}

export { BreadCrumbs }
