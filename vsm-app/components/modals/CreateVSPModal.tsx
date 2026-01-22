import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Alert
} from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { validateVSPVersion } from '@/helpers/vspHelpers'
import { CreateVSPRequest } from '@/types/vspTypes'

interface CreateVSPModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateVSPRequest) => Promise<void>
  loading: boolean
}

export const CreateVSPModal = ({ isOpen, onClose, onSubmit, loading }: CreateVSPModalProps) => {
  // IG fields
  const [igCanonical, setIgCanonical] = useState('')
  const [igPackageId, setIgPackageId] = useState('')
  const [igName, setIgName] = useState('')
  const [igTitle, setIgTitle] = useState('')
  const [igExperimental, setIgExperimental] = useState(false)

  // VSP fields
  const [vspVersion, setVspVersion] = useState('')
  const [experimental, setExperimental] = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize VSP version to current month (YYYY-MM)
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    setVspVersion(`${year}-${month}`)
  }, [])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIgCanonical('')
      setIgPackageId('')
      setIgName('')
      setIgTitle('')
      setIgExperimental(false)
      setVspVersion('')
      setExperimental(false)
      setErrors({})
    }
  }, [isOpen])

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!igCanonical.trim()) {
      newErrors.igCanonical = 'IG Canonical is required'
    } else if (!igCanonical.includes('|')) {
      newErrors.igCanonical = 'IG Canonical must include version (e.g., http://...| 6.1.0)'
    }

    if (!igPackageId.trim()) {
      newErrors.igPackageId = 'IG Package ID is required'
    }

    if (!igName.trim()) {
      newErrors.igName = 'IG Name is required'
    }

    if (!igTitle.trim()) {
      newErrors.igTitle = 'IG Title is required'
    }

    if (!vspVersion.trim()) {
      newErrors.vspVersion = 'VSP Version is required'
    } else if (!validateVSPVersion(vspVersion)) {
      newErrors.vspVersion = 'Invalid version format. Must be YYYY-MM (e.g., "2026-01")'
    }

    // Experimental validation
    if (igExperimental && !experimental) {
      newErrors.experimental = 'VSP cannot be experimental=false when IG is experimental=true'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      return
    }

    const data: CreateVSPRequest = {
      igCanonical,
      igPackageId,
      igName,
      igTitle,
      igExperimental,
      vspVersion,
      experimental
    }

    await onSubmit(data)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Value Set Package</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto', maxHeight: '70vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Create a new Value Set Package from an Implementation Guide. Fill in the IG metadata below.
          </Typography>

          {/* IG Canonical */}
          <TextField
            label="IG Canonical *"
            placeholder="http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0"
            value={igCanonical}
            onChange={(e) => setIgCanonical(e.target.value)}
            error={Boolean(errors.igCanonical)}
            helperText={errors.igCanonical || 'Full canonical URL with version (pipe-separated)'}
            fullWidth
            disabled={loading}
          />

          {/* IG Package ID */}
          <TextField
            label="IG Package ID *"
            placeholder="hl7.fhir.us.core"
            value={igPackageId}
            onChange={(e) => setIgPackageId(e.target.value)}
            error={Boolean(errors.igPackageId)}
            helperText={errors.igPackageId || 'NPM package identifier'}
            fullWidth
            disabled={loading}
          />

          {/* IG Name */}
          <TextField
            label="IG Name *"
            placeholder="USCore"
            value={igName}
            onChange={(e) => setIgName(e.target.value)}
            error={Boolean(errors.igName)}
            helperText={errors.igName || 'Computer-friendly name (no spaces)'}
            fullWidth
            disabled={loading}
          />

          {/* IG Title */}
          <TextField
            label="IG Title *"
            placeholder="US Core"
            value={igTitle}
            onChange={(e) => setIgTitle(e.target.value)}
            error={Boolean(errors.igTitle)}
            helperText={errors.igTitle || 'Human-friendly title'}
            fullWidth
            disabled={loading}
          />

          {/* IG Experimental */}
          <FormControlLabel
            control={
              <Checkbox checked={igExperimental} onChange={(e) => setIgExperimental(e.target.checked)} disabled={loading} />
            }
            label="IG is Experimental"
          />

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Value Set Package Details
            </Typography>
          </Box>

          {/* VSP Version */}
          <TextField
            label="VSP Version *"
            placeholder="2026-01"
            value={vspVersion}
            onChange={(e) => setVspVersion(e.target.value)}
            error={Boolean(errors.vspVersion)}
            helperText={errors.vspVersion || 'Version in YYYY-MM format'}
            fullWidth
            disabled={loading}
          />

          {/* VSP Experimental */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox checked={experimental} onChange={(e) => setExperimental(e.target.checked)} disabled={loading} />
              }
              label="VSP is Experimental"
            />
            {errors.experimental && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errors.experimental}
              </Alert>
            )}
          </Box>

          {igExperimental && (
            <Alert severity="info">
              The Implementation Guide is marked as experimental. The VSP must also be experimental.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          text="Cancel"
          onClick={onClose}
          disabled={loading}
          style={{ backgroundColor: 'gray', color: 'white' }}
        />
        <Button
          text={loading ? 'Creating...' : 'Create VSP'}
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
