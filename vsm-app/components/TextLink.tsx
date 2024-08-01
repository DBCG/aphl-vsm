import Link from 'next/link'
import styled from 'styled-components'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import { useRouter } from 'next/router'

const LinkContainer = styled.div`
  display: flex;
  color: var(--theme-300);
  align-items: center;
  &:hover {
    color: var(--theme-500);
  }
`

const StyledLink = styled(Link)`
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 0;
`

interface TextLinkProps {
  href: string
  linkText?: string
  className?: string
  hasIcon?: boolean
  forceReload?: boolean
}

const TextLink = ({ href, linkText, className, hasIcon = true, forceReload = false }: TextLinkProps) => {
  const router = useRouter()
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (forceReload) {
      e.preventDefault()
      router.push(href)
    }
  }

  const content = (
    <StyledLink href={href} className={className} onClick={handleClick}>
      {linkText}
    </StyledLink>
  )

  return hasIcon ? (
    <LinkContainer>
      <ArrowOutwardIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px', marginRight: '8px' }} />
      {content}
    </LinkContainer>
  ) : (
    content
  )
}

export default TextLink
