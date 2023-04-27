import React, { useState } from 'react'
import styled from 'styled-components'
import Image from 'next/image'
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal'

const StyledButton = styled.button<IButtonProps>`
  height: 36px;
  width: 36px;
  border-radius: 50%;
  background-color: ${(props) => (props.disabled ? 'lightgray' : 'var(--theme-300)')};
  cursor: ${(props) => (props.disabled ? 'not-allowed !important' : 'pointer')};
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
  onClick: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  disabled?: boolean
  deletedItemDescription?: string
}

const btnTitleText = {
  edit: 'Edit',
  delete: 'Delete',
  search: 'Search',
  clone: 'Make a new program based on this one (must have active status)',
  release: 'Promote this program from draft to active status',
  publish: 'Publish this program',
  retire: 'Convert program from active to retired status'
}

type Key = keyof typeof btnTitleText

const IconButton = ({ type, buttonContext, onClick, style, disabled = false, deletedItemDescription }: IButtonProps) => {
  const [modalOpen, setModalOpen] = useState(false)

  const handleClickIconButton = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (buttonContext === 'delete') {
      setModalOpen(true)
    } else {
      onClick(e)
    }
  }

  const handleToggleModalOpen = () => {
    setModalOpen((o) => !o)
  }

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
    case 'retire':
      image = 'retire'
      break
  }

  return (
    <div>
      <DeleteConfirmationModal
        isOpen={modalOpen}
        toggleModalOpen={handleToggleModalOpen}
        handleConfirmDelete={onClick}
        itemToDelete={deletedItemDescription}
      />
      <StyledButton
        title={btnTitleText[buttonContext as Key]}
        disabled={disabled}
        type={type}
        buttonContext={buttonContext}
        style={style}
        onClick={(e) => {
          !disabled && e ? handleClickIconButton(e) : null
        }}
      >
        <ImageContainer>
          <Image src={`/images/${image}.svg`} width={24} height={24} alt="" />
        </ImageContainer>
      </StyledButton>
    </div>
  )
}

export { IconButton }
