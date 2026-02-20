import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import styled from 'styled-components'
import Breadcrumbs from '@mui/material/Breadcrumbs'

interface Props {
  alpha: number
  shouldCapitalize?: boolean
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
  text-transform: ${(props) => props.shouldCapitalize !== false ? 'capitalize' : 'none'};
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
  padding-left: 14px;
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
  if (result === '/value-set-packages') {
    result = `/programs?resourceType=vsp`
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
      let routePath = router.asPath
      if (router.pathname.includes('/programs/compare')) {
        routePath = routePath.split('#')[0]
      } if (router.pathname.includes('/provisional/codesystem')) {
        routePath = routePath.split('?')[0]
      }
      const crumbs = routePath.split('/')
      const withoutQueryStrings = crumbs?.map((crumb) => crumb?.split('?')?.[0])
      if (isGrouperView && withoutQueryStrings.indexOf('valuesets') === -1) {
        withoutQueryStrings[withoutQueryStrings.indexOf('valuesets')] = 'grouper'
      }

      setBreadCrumbs(withoutQueryStrings)
    } else {
      setBreadCrumbs([])
    }
  }, [router, isGrouperView])

  if (!breadCrumbs.length) return null

  // Map URL segments to display names
  const getDisplayName = (segment: string): string => {
    const displayNameMap: Record<string, string> = {
      'value-set-packages': 'ValueSet Packages'
    }
    return displayNameMap[segment] || segment.replace('?id=', ' ')
  }

  // Check if segment looks like a resource ID that shouldn't be capitalized
  // Examples: hl7.fhir.us.core-vsp-2026-01, program-id-123, etc.
  const shouldCapitalize = (segment: string): boolean => {
    // Don't capitalize if it contains multiple dots and hyphens (looks like a package ID)
    // or if it contains -vsp- pattern (VSP ID)
    const looksLikeResourceId = segment.includes('.') && segment.includes('-')
    const isVSPId = segment.includes('-vsp-')
    return !looksLikeResourceId && !isVSPId
  }

  const items = breadCrumbs.map((c) => {
    if (c !== '') {
      return (
        <Link key={c} href={composePath(router.asPath, c)} passHref>
          <NavItem id={`breadcrumb-${c}`} alpha={1} shouldCapitalize={shouldCapitalize(c)}>
            {getDisplayName(c)}
          </NavItem>
        </Link>
      )
    }
  })
  items.unshift(
    <Link key={'homepage'} href={'/programs'} passHref>
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
