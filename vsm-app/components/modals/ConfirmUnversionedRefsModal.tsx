import React from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material'
import { ModalContent } from '@/styles/modal'

export type ConfirmUnversionedRefsAction = 'export' | 'release'

interface Props {
  isOpen: boolean
  action: ConfirmUnversionedRefsAction
  codeSystems: string[]
  valueSets: string[]
  onCancel: () => void
  onConfirm: () => void
  confirmLoading?: boolean
}

const ACTION_COPY: Record<ConfirmUnversionedRefsAction, { title: string; intro: string; confirmLabel: string }> = {
  export: {
    title: 'Unversioned manifest references',
    intro:
      'This VSP has manifest entries without a pinned version. Unversioned entries are not applied during $package and may produce inconsistent results. You can proceed, but the unversioned entries below will not influence the exported bundle.',
    confirmLabel: 'Export anyway'
  },
  release: {
    title: 'Unversioned manifest references',
    intro:
      'This VSP has manifest entries without a pinned version. Unversioned entries are not applied during $release-manifest. You can proceed, but the unversioned entries below will not be pinned in the released VSP.',
    confirmLabel: 'Release anyway'
  }
}

const Section = ({ heading, items }: { heading: string; items: string[] }) => {
  if (items.length === 0) return null
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {heading} ({items.length})
      </Typography>
      <List dense disablePadding sx={{ maxHeight: 180, overflow: 'auto' }}>
        {items.map((canonical) => (
          <ListItem key={canonical} disableGutters sx={{ py: 0 }}>
            <ListItemText
              primaryTypographyProps={{ variant: 'body2', sx: { wordBreak: 'break-all' } }}
              primary={canonical}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

const ConfirmUnversionedRefsModal = ({
  isOpen,
  action,
  codeSystems,
  valueSets,
  onCancel,
  onConfirm,
  confirmLoading = false
}: Props) => {
  const copy = ACTION_COPY[action]

  return (
    <Dialog open={isOpen} onClose={onCancel} maxWidth="sm" fullWidth>
      <ModalContent style={{ minWidth: '320px' }}>
        <DialogTitle sx={{ textAlign: 'left' }}>{copy.title}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            <DialogContentText sx={{ color: 'inherit' }}>{copy.intro}</DialogContentText>
          </Alert>
          <Section heading="CodeSystems" items={codeSystems} />
          <Section heading="ValueSets" items={valueSets} />
        </DialogContent>
        <DialogActions>
          <Button disabled={confirmLoading} onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={confirmLoading} variant="contained" onClick={onConfirm}>
            {copy.confirmLabel}
          </Button>
        </DialogActions>
      </ModalContent>
    </Dialog>
  )
}

export default ConfirmUnversionedRefsModal
