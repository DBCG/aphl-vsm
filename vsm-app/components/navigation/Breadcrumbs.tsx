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

const composePath = (pathItems: string, lastOfPath: string, index) => {
  let pathToUpdate = pathItems
  if (lastOfPath === 'grouper') {
    // remove the valuesets part of the path since groupers are located there
    return pathToUpdate.split('/valuesets')[0]
  }
  const idx = pathItems.indexOf(lastOfPath)
  if (pathToUpdate.startsWith('/provisional/')) {
    return '/programs?resourceType=provisional'
    console.log('path to update: ', pathToUpdate)
  }

  const result = pathToUpdate.slice(0, idx + pathToUpdate.length)
  const pathAsArr = result.split('/').filter(i => i !== '').filter((i, idx) => idx < index).join('/')
  console.log('path as arr: ')
  console.log('result here: ', result.split('/').filter(i => i !== ''))
  console.log('index: idx: ', idx)
  console.log('lastOfPath: ', lastOfPath)
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
      const [path, query] = router.asPath.split('?')
      console.log('router.aspath: ', router.asPath)
      const crumbs = path.split('/')
      console.log('crumbs: ', crumbs)
      const withoutQueryStrings = crumbs?.map((crumb) => crumb?.split('?')?.[0])
      console.log('withoutquerystrings: ', withoutQueryStrings)
      if (isGrouperView && withoutQueryStrings.indexOf('valuesets') === -1) {
        withoutQueryStrings[withoutQueryStrings.indexOf('valuesets')] = 'grouper'
      }
      console.log('without query strings: ', withoutQueryStrings)
      setBreadCrumbs(withoutQueryStrings)
    } else {
      setBreadCrumbs([])
    }
  }, [router, isGrouperView])

  if (!breadCrumbs.length) return null

  const items = breadCrumbs.map((c, index) => {
    if (c !== '') {
      console.log('path: ', composePath(router.asPath, c))
      return (
        <Link key={c} href={composePath(router.asPath, c, index)} passHref>
          <NavItem id={`breadcrumb-${c}`} alpha={index / 0.1}>{`${c.replace('?id=', ' ')}`}</NavItem>
        </Link>
      )
    }
  })

  return (
    <nav>
      <Breadcrumbs aria-label="breadcrumb">
        <NavList>{items}</NavList>
      </Breadcrumbs>
    </nav>
  )
}

export { BreadCrumbs }
