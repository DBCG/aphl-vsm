import Link from 'next/link';
import styled from 'styled-components';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';

const StyledLink = styled.a`
  color: var(--theme-300);
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 0;
`;

const LinkContainer = styled.div`
  display: flex;
  align-items: center;
`;

interface TextLinkProps {
  href: string;
  linkText?: string;
  className?: string;
  hasIcon?: boolean;
  forceReload?: boolean;
}

const TextLink = ({
  href,
  linkText,
  className,
  forceReload = false,
}: TextLinkProps) => {

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (forceReload) {
      e.preventDefault();
      window.location.href = href;
    }
  };

  const content = (
    <StyledLink href={href} className={className} onClick={handleClick}>
      {linkText}
    </StyledLink>
  );

  return (
    <Link href={href} passHref>
      {hasIcon ? (
        <LinkContainer>
          {content}
          <ArrowOutwardIcon sx={{ color: 'var(--theme-400)', width: '20px', height: '20px', marginLeft: '8px' }} />
        </LinkContainer>
      ) : (
        content
      )}
    </Link>
  );
};

export default TextLink;
