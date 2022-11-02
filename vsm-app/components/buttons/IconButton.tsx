import React from 'react';
import styled from 'styled-components'
import Image from 'next/image'

const StyledButton = styled.button`
  height: 36px;
  width: 36px;
  border-radius: 50%;
  background-color: var(--theme-300);
  cursor: pointer;
  box-shadow: none;
  border: none;
  padding-top: 4px;
`

const ImageContainer = styled.div`
  padding-top: 3px;
`

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  buttonContext: string;
  onClick: React.EventHandler<React.MouseEvent>
}

const IconButton = ({ type, buttonContext, onClick, style }: IButtonProps) => {
  let image = 'missing'

  switch (buttonContext) {
    case 'edit':
      image = 'edit'
      break
    case 'delete':
      image = 'delete'
      break
    case 'search':
      image = 'search'
      break
    case 'clone':
      image = 'clone'
      break
    case 'publish':
      image = 'publish'
      break
    case 'release':
      image = 'release'
      break
  }

  return (
    <StyledButton type={type} style={style} onClick={e => onClick(e)}>
      <ImageContainer>
        <Image
          src={`/images/${image}.svg`}
          width={24}
          height={24}
          alt=''
        />
      </ImageContainer>
    </StyledButton>
  )
}

export { IconButton }