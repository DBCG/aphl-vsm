import { useState } from 'react'
import { Modal, Box, Typography } from '@mui/material'
import { Button } from '../buttons/Button'
import { SelectInputContainer } from './styles'

import Select, { Options } from 'react-select'
import { priorityLevelOptions, OptionType } from '.'
import { TableRow } from '@/types/valuesets'
import { USHealthVSPriority } from '@/helpers/valueSetHelpers'

interface BatchEditModalProps {
  isOpen: boolean
  handleClose: () => void
  selectedVs: TableRow[]
  bulkUpdateFn: (priority: USHealthVSPriority) => Promise<void>
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4
}

const BatchEditModal = ({ isOpen, handleClose, selectedVs = [], bulkUpdateFn }: BatchEditModalProps) => {
  const [selectedPriority, setSelectedPriority] = useState<OptionType | null>(null)
  const [updateInFlight, setUpdateInFlight] = useState(false)
  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2">
          Bulk Edit Valuesets
        </Typography>
        <Typography sx={{ display: 'flex', mb: 2 }}>Apply the following changes to {selectedVs.length} ValueSets</Typography>
        <SelectInputContainer>
          Priority
          <Select
            menuPlacement="bottom"
            placeholder="Select Priority"
            classNamePrefix="priority"
            inputId="priority-selector"
            instanceId="priority-selector"
            options={priorityLevelOptions}
            value={selectedPriority}
            // @ts-ignore
            onChange={setSelectedPriority}
          />
        </SelectInputContainer>
        <Box sx={{ display: 'flex', mt: 3, flexDirection: 'row-reverse' }}>
          <Button
            style={{ marginLeft: '2px' }}
            text="Update"
            disabled={!selectedPriority}
            loading={updateInFlight}
            onClick={async () => {
              setUpdateInFlight(true)
              if (!selectedPriority) return
              await bulkUpdateFn(selectedPriority?.value as USHealthVSPriority)
              setUpdateInFlight(false)
              handleClose()
            }}
          />
          <Button text="Cancel" onClick={() => handleClose()} />
        </Box>
      </Box>
    </Modal>
  )
}

export default BatchEditModal
