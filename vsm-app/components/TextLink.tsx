import React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'

const LinkContainer = styled.div`
display: flex;
color: var(--theme-300);
align-items: center;
&:hover {
  color: var(--theme-500);
  cursor: pointer;
};
`

const StyledLink = styled(Link)`
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 0;
`

const VerticalCenter = styled.div`
  display: flex;
  align-items: center;
`

interface TextLinkProps {
  href: string
  linkText?: string
  className?: string
  hasIcon?: boolean
  forceReload?: boolean
}

const TextLink = ({ href, linkText, className, hasIcon = true, forceReload = false }: TextLinkProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (forceReload) {
      e.preventDefault()
      window.location.href = href
    }
  }

  const wrapWithLink = ({ content }: {content: string | React.ReactNode}) => {
    return (
      <StyledLink href={href} className={className} onClick={handleClick}>
        {content}
      </StyledLink>
    )
  }

  const content = (
    <VerticalCenter>
      {hasIcon &&
        <ArrowOutwardIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px', marginRight: '8px' }} />
      }
      {linkText}
    </VerticalCenter>
  )

  return (
    <LinkContainer>
      {wrapWithLink({content})}
    </LinkContainer>
  )
}

export default TextLink
