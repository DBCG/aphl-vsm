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

interface IButtonProps {
  type: string;
  onClick: React.EventHandler<React.MouseEvent>
}

const IconButton = ({ type, onClick }: IButtonProps) => {
  let image = 'missing'

  switch (type) {
    case 'edit':
      image = 'edit'
  }

  return (
    <StyledButton onClick={e => onClick(e)}>
      <Image
        src={`/images/${image}.svg`}
        width={24}
        height={24}
        alt=''
      />
    </StyledButton>
  )
}

export { IconButton }