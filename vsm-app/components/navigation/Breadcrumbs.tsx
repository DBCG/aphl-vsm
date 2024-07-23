import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import styled from 'styled-components'
import Breadcrumbs from '@mui/material/Breadcrumbs'

interface Props {
  alpha: number
}

const NavList = styled.ul`
  display: flex;
  flex-direction: row;
  & > :last-child {
    font-weight: bold;
  }
`

const NavItem = styled.li<Props>`
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
const HomepageItem = styled(NavItem)`
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%);
  padding-left: 8px;
`

const composePath = (pathItems: string, lastOfPath: string) => {
  if (lastOfPath === 'grouper') {
    // remove the valuesets part of the path since groupers are located there
    return pathItems.split('/valuesets')[0]
  }
  const idx = pathItems.indexOf(lastOfPath)
  let result = pathItems.slice(0, idx + lastOfPath.length)
  if (result === '/provisional') {
    result = `/programs?resourceType=provisional`
  }
  return result
}

type BreadCrumbProps = {
  isGrouperView: boolean
}

const BreadCrumbs = ({ isGrouperView }: BreadCrumbProps) => {
  const [breadCrumbs, setBreadCrumbs] = useState<[] | string[]>([])
  const router = useRouter()

  useEffect(() => {
    if (router) {
      const withoutQueryStrings = router.asPath.split('?')[0].split('/')
      if (isGrouperView && withoutQueryStrings.indexOf('valuesets') === -1) {
        withoutQueryStrings[withoutQueryStrings.indexOf('valuesets')] = 'grouper'
      }

      setBreadCrumbs(withoutQueryStrings)
    } else {
      setBreadCrumbs([])
    }
  }, [router, isGrouperView])

  if (!breadCrumbs.length) return null

  const items = breadCrumbs.map((c, index) => {
    if (c !== '') {
      return (
        <Link key={c} href={composePath(router.asPath, c)} passHref>
          <NavItem id={`breadcrumb-${c}`} alpha={index / 0.1}>{`${c.replace('?id=', ' ')}`}</NavItem>
        </Link>
      )
    }
  })
  items.unshift(
    <Link key={'homepage'} href={'/'} passHref>
      <HomepageItem id={`breadcrumb-homepage`} alpha={1}>{`Home`}</HomepageItem>
    </Link>
  )

  return (
    <nav>
      <Breadcrumbs aria-label="breadcrumb">
        <NavList>{items}</NavList>
      </Breadcrumbs>
    </nav>
  )
}

export { BreadCrumbs }
