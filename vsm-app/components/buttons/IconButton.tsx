import React, { useState } from 'react'
import { IconButton as Icb, IconButtonProps } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import PublishIcon from '@mui/icons-material/Publish'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt'
import DoNotTouchIcon from '@mui/icons-material/DoNotTouch'
import EditIcon from '@mui/icons-material/Edit'
import styled from 'styled-components'
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal'

const StyledButton = styled(Icb).attrs<IButtonProps>(({ buttonContext }) => ({
  ariaLabel: buttonContext,
  component: 'label'
}))`
  height: 36px;
  width: 36px;
  border-radius: 50%;
  background-color: ${(props) => (props.disabled ? 'lightgray !important' : 'var(--theme-300)')};
  cursor: ${(props) => (props.disabled ? 'not-allowed !important' : 'pointer')};
  box-shadow: none;
  border: none;
  padding-top: 4px;
  &::hover {
    pointer-events: ${(props) => (props.disabled ? 'unset' : 'pointer')};
  }
`

const ImageContainer = styled.div`
  padding-top: 8px;
`

interface IButtonProps extends IconButtonProps {
  buttonContext?: string | undefined
  onClick: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  disabled?: boolean
  deletedItemDescription?: string
  ariaLabel?: string
}

const btnTitleText = {
  edit: 'Edit',
  delete: 'Delete',
  search: 'Search',
  clone: 'Make a new program based on this one (must have active status)',
  release: 'Promote a program from draft to active status',
  publish: 'Publish this program',
  retire: 'Convert program from active to retired status'
}

type Key = keyof typeof btnTitleText

const IconButton = ({ type, buttonContext, onClick, style, disabled = false, deletedItemDescription, ...props }: IButtonProps) => {
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

  let image = <PsychologyAltIcon />

  switch (buttonContext) {
    case 'edit':
      image = <EditIcon />
      break
    case 'delete':
      image = <DeleteForeverIcon />
      break
    case 'search':
      image = <SearchIcon />
      break
    case 'clone':
      image = <ContentCopyIcon />
      break
    case 'publish':
      image = <PublishIcon />
      break
    case 'release':
      image = <NewReleasesIcon />
      break
    case 'retire':
      image = <DoNotTouchIcon />
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
        // @ts-ignore
        buttonContext={buttonContext}
        data-button-context={buttonContext}
        style={style}
        onClick={(e) => {
          !disabled && e ? handleClickIconButton(e) : null
        }}
        {...props}
      >
        <ImageContainer>{image}</ImageContainer>
      </StyledButton>
    </div>
  )
}

export { IconButton }
