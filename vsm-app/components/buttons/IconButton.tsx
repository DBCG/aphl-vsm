import React, { useState } from 'react'
import { IconButton as Icb, IconButtonProps } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import PublishIcon from '@mui/icons-material/Publish'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt'
import DoNotTouchIcon from '@mui/icons-material/DoNotTouch'
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit'
import styled from 'styled-components'
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal'

const StyledButton = styled(Icb).attrs<IButtonProps>(({ buttoncontext }) => ({
  'aria-label': buttoncontext,
  component: 'label'
}))<IButtonProps & IconButtonProps>`
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
  buttoncontext?: string | undefined
  onClick: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  disabled?: boolean
  color?: 'default' | 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | undefined
  deletedItemDescription?: string
  ariaLabel?: string
}

const btnTitleText = {
  edit: 'Edit',
  delete: 'Delete',
  search: 'Search',
  update: 'Update',
  clone: 'Make a new program based on this one (must have active status)',
  release: 'Promote a program from draft to active status',
  mustApproveRelease: 'You must approve this draft to release it',
  publish: 'Publish this program',
  retire: 'Convert program from active to retired status'
}

type Key = keyof typeof btnTitleText

const IconButton = ({ type, buttoncontext, onClick, style, disabled = false, deletedItemDescription, ...props }: IButtonProps) => {
  const [modalOpen, setModalOpen] = useState(false)

  const handleClickIconButton = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (buttoncontext === 'delete') {
      setModalOpen(true)
    } else {
      onClick(e)
    }
  }

  const handleToggleModalOpen = () => {
    setModalOpen((o) => !o)
  }

  let image = <PsychologyAltIcon />

  if (buttoncontext === 'edit') {
    image = <EditIcon/>
  } else if (buttoncontext === 'delete') {
    image = <DeleteForeverIcon/>
  } else if (buttoncontext === 'search') {
    image = <SearchIcon/>
  } else if (buttoncontext?.toLowerCase()?.includes('clone')) {
    image = <ContentCopyIcon/>
  } else if (buttoncontext?.toLowerCase()?.includes('publish')) {
    image = <PublishIcon/>
  } else if (buttoncontext?.toLowerCase()?.includes('release')) {
    image = <NewReleasesIcon/>
  } else if (buttoncontext === 'retire') {
    image = <DoNotTouchIcon/>
  } else if (buttoncontext?.toLowerCase()?.includes('update')) {
    image = <RefreshIcon/>
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
        title={btnTitleText[buttoncontext as Key]}
        disabled={disabled}
        type={type}
        // @ts-ignore
        buttoncontext={buttoncontext}
        data-button-context={buttoncontext}
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
