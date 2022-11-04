import React from 'react'
import styled from 'styled-components'
import Image from 'next/image'

const StyledButton = styled.button`
  height: 36px;
  width: 36px;
  border-radius: 50%;
  background-color: ${props => props.disabled ? 'lightgray' : 'var(--theme-300)'};
  cursor: ${props => props.disabled ? 'not-allowed !important' : 'pointer'};
  cursor: pointer;
  box-shadow: none;
  border: none;
  padding-top: 4px;
`

const ImageContainer = styled.div`
  padding-top: 3px;
`

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  buttonContext: string
  onClick: React.EventHandler<React.MouseEvent>
  disabled?: boolean
}

const btnTitleText = {
  edit: 'Edit',
  delete: 'Delete',
  search: 'Search',
  clone: 'Make a new program based on this one',
  release: 'Promote this program from draft to active status',
  publish: 'Publish this program'
}

type Key = keyof typeof btnTitleText

const IconButton = ({ type, buttonContext, onClick, style, disabled=false }: IButtonProps) => {
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
    <StyledButton
      title={btnTitleText[buttonContext as Key]}
      disabled={disabled}
      type={type}
      style={style}
      onClick={e => {
        !disabled ? onClick(e) : null
      }}
    >
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