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
  Alert,
  Chip
} from '@mui/material'
import { Button } from '@/components/buttons/Button'
import { validateVSPVersion } from '@/helpers/vspHelpers'
import { CreateVSPRequest, ExtendedManifestData } from '@/types/vspTypes'
import NotificationStore from '@/store/NotificationStore'
import { JOB_TYPE } from '@/constants'
import { apiFetch } from '@/utils'

interface CreateVSPModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateVSPRequest) => Promise<void>
  loading: boolean
  initialData?: {
    jobId?: string // Job ID to remove from notifications when VSP is created
    igCanonical?: string
    igPackageId?: string
    igName?: string
    igTitle?: string
    manifestData?: ExtendedManifestData
    source?: string
    warnings?: string[]
  }
}

export const CreateVSPModal = ({ isOpen, onClose, onSubmit, loading, initialData }: CreateVSPModalProps) => {
  // IG fields
  const [igCanonical, setIgCanonical] = useState('')
  const [igPackageId, setIgPackageId] = useState('')
  const [igName, setIgName] = useState('')
  const [igTitle, setIgTitle] = useState('')

  // VSP fields
  const [vspVersion, setVspVersion] = useState('')

  // Manifest/Dependencies
  const [manifestData, setManifestData] = useState<ExtendedManifestData | undefined>(undefined)
  const [fetchingDependencies, setFetchingDependencies] = useState(false)
  const [dependencyWarnings, setDependencyWarnings] = useState<string[]>([])
  const [dependencySource, setDependencySource] = useState<string | null>(null)
  const [dependencyJobId, setDependencyJobId] = useState<string | null>(null)
  const [sourceJobId, setSourceJobId] = useState<string | null>(null) // Track the original job that created this data

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize VSP version to current month (YYYY-MM)
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    setVspVersion(`${year}-${month}`)
  }, [])

  // Update fields when initialData changes (e.g., from notification click)
  useEffect(() => {
    if (initialData && isOpen) {
      console.log('CreateVSPModal: Populating from initialData:', initialData)

      // Always set these fields from initialData, even if empty
      setIgCanonical(initialData.igCanonical || '')
      setIgPackageId(initialData.igPackageId || '')
      setIgName(initialData.igName || '')
      setIgTitle(initialData.igTitle || '')

      // Set dependency data if available
      if (initialData.manifestData) {
        console.log('Setting manifestData:', initialData.manifestData)
        setManifestData(initialData.manifestData)
      }
      if (initialData.warnings) {
        setDependencyWarnings(initialData.warnings)
      }
      if (initialData.source) {
        setDependencySource(initialData.source)
      }

      // Track the job ID if this came from a notification
      if (initialData.jobId) {
        setSourceJobId(initialData.jobId)
      }

      // If we have initial data from a completed job, don't show fetching state
      setFetchingDependencies(false)
      setDependencyJobId(null)

      console.log('CreateVSPModal: Fields populated')
    }
  }, [initialData, isOpen])

  // Listen for dependency job updates
  useEffect(() => {
    if (!dependencyJobId) return

    console.log('[CreateVSPModal] Setting up listener for dependency job:', dependencyJobId)

    let pollingInterval: NodeJS.Timeout | null = null
    let hasProcessedResult = false

    const processJobResult = async (result: any) => {
      if (hasProcessedResult) {
        console.log('[CreateVSPModal] Result already processed, skipping')
        return
      }

      console.log('[CreateVSPModal] Processing job result - source:', result.source, 'warnings:', result.warnings?.length || 0)
      hasProcessedResult = true

      // Update state with results
      if (result.manifestData) {
        console.log('[CreateVSPModal] Setting manifestData - CodeSystems:', Object.keys(result.manifestData.codeSystems || {}).length, 'ValueSets:', Object.keys(result.manifestData.valueSets || {}).length)
        setManifestData(result.manifestData)
      }
      if (result.igName) {
        setIgName(result.igName)
      }
      if (result.igTitle) {
        setIgTitle(result.igTitle)
      }
      if (result.warnings) {
        setDependencyWarnings(result.warnings)
      }
      if (result.source) {
        setDependencySource(result.source)
      }

      console.log('[CreateVSPModal] Stopping fetch loading state')
      setFetchingDependencies(false)
      setDependencyJobId(null)

      // Clear polling if it exists
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    }

    // Immediately check if job is already completed
    const checkJobStatus = async () => {
      try {
        const response = await apiFetch(`/api/jobs/${dependencyJobId}/result`)
        if (response.ok) {
          const jobResult = await response.json()
          console.log('[CreateVSPModal] Job status check:', jobResult.state)

          // If job is already completed, process the result immediately
          if (jobResult.state === 'completed') {
            console.log('[CreateVSPModal] Job already completed, processing result...')
            await processJobResult(jobResult.returnvalue || {})
            return true // Signal that job is done
          } else if (jobResult.state === 'failed') {
            const errorMsg = jobResult.error || 'Job failed'
            setDependencyWarnings([`Error: ${errorMsg}. Please add dependencies manually after creation.`])
            setFetchingDependencies(false)
            setDependencyJobId(null)
            return true // Signal that job is done
          }
        }
      } catch (error) {
        console.error('[CreateVSPModal] Error checking job status:', error)
      }
      return false // Job not done yet
    }

    // Set up direct polling as fallback (every 3 seconds)
    const startPolling = () => {
      console.log('[CreateVSPModal] Starting direct polling fallback')
      pollingInterval = setInterval(async () => {
        console.log('[CreateVSPModal] Polling job status...')
        const isDone = await checkJobStatus()
        if (isDone && pollingInterval) {
          clearInterval(pollingInterval)
          pollingInterval = null
        }
      }, 3000)
    }

    // Check immediately and start polling
    checkJobStatus().then((isDone) => {
      if (!isDone) {
        startPolling()
      }
    })

    const cleanup = NotificationStore.listenForJob(dependencyJobId, async (job: any) => {
      console.log('[CreateVSPModal] Dependency job update received:', job)

      if (job.status === 'COMPLETED') {
        console.log('[CreateVSPModal] Dependency job completed via listener, fetching result...')

        // Fetch the full job result from the new /api/jobs/[id]/result endpoint
        try {
          const response = await apiFetch(`/api/jobs/${dependencyJobId}/result`)
          if (!response.ok) {
            throw new Error(`Failed to fetch job result: ${response.status}`)
          }

          const jobResult = await response.json()
          console.log('[CreateVSPModal] Job result fetched via listener - state:', jobResult.state)

          await processJobResult(jobResult.returnvalue || {})
        } catch (error: any) {
          console.error('[CreateVSPModal] Error fetching job result via listener:', error)
          if (!hasProcessedResult) {
            setDependencyWarnings([`Error fetching results: ${error.message}. Please add dependencies manually.`])
            setFetchingDependencies(false)
            setDependencyJobId(null)
          }
        }
      } else if (job.status === 'FAILED') {
        console.log('[CreateVSPModal] Dependency job failed via listener:', job.error)
        if (!hasProcessedResult) {
          const errorMsg = job.error || 'Job failed'
          setDependencyWarnings([`Error: ${errorMsg}. Please add dependencies manually after creation.`])
          setFetchingDependencies(false)
          setDependencyJobId(null)
        }
      } else {
        console.log('[CreateVSPModal] Job status via listener:', job.status)
      }
    })

    // Return cleanup function
    return () => {
      console.log('[CreateVSPModal] Cleaning up dependency job listener and polling')
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [dependencyJobId])

  // Reset form when modal closes (but keep job running if in progress)
  useEffect(() => {
    if (!isOpen) {
      setIgCanonical('')
      setIgPackageId('')
      setIgName('')
      setIgTitle('')
      setVspVersion('')
      setErrors({})
      setSourceJobId(null) // Clear the source job ID
      // Don't reset dependency state if job is still running
      if (!fetchingDependencies) {
        setManifestData(undefined)
        setDependencyWarnings([])
        setDependencySource(null)
        setDependencyJobId(null)
      }
    }
  }, [isOpen, fetchingDependencies])

  // Cancel dependency fetch
  const handleCancelDependencyFetch = async () => {
    if (dependencyJobId) {
      const success = await NotificationStore.cancelJob(dependencyJobId)
      if (success) {
        setFetchingDependencies(false)
        setDependencyJobId(null)
        setDependencyWarnings(['Dependency fetch cancelled. You can add dependencies manually after creation.'])
      }
    }
  }

  // Fetch dependencies using FHIR operations workflow (starts background job)
  const handleFetchDependencies = async () => {
    // Validate required fields
    if (!igCanonical.trim()) {
      setErrors({ ...errors, igCanonical: 'IG Canonical is required to fetch dependencies' })
      return
    }

    if (!igCanonical.includes('|')) {
      setErrors({ ...errors, igCanonical: 'IG Canonical must include version (e.g., |6.1.0)' })
      return
    }

    if (!igPackageId.trim()) {
      setErrors({ ...errors, igPackageId: 'IG Package ID is required to fetch dependencies' })
      return
    }

    setFetchingDependencies(true)
    setDependencyWarnings([])
    setDependencySource(null)

    try {
      const params = new URLSearchParams({
        igCanonical,
        igPackageId
      })

      // POST to start the background job
      const response = await apiFetch(`/api/implementation-guides/dependencies?${params}`, {
        method: 'POST'
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start dependency fetch')
      }

      if (result.success && result.jobId) {
        console.log('[CreateVSPModal] Job started successfully, ID:', result.jobId)
        setDependencyJobId(result.jobId)

        // Add job to NotificationStore
        await NotificationStore.addJob({
          jobId: result.jobId,
          jobType: JOB_TYPE.FETCH_DEPENDENCIES,
          metadata: {
            igCanonical,
            igPackageId
          },
          onSuccess: (jobResult: any) => {
            console.log('[CreateVSPModal] addJob onSuccess callback fired')
            // Update metadata with results
            NotificationStore.setMetadata({
              [result.jobId]: {
                metadata: {
                  igCanonical,
                  igPackageId,
                  ...jobResult
                }
              }
            })
          },
          onFailure: (error: string) => {
            console.error('[CreateVSPModal] addJob onFailure callback fired:', error)
          }
        })
      } else {
        setDependencyWarnings(['Could not start dependency fetch. Please add them manually after creation.'])
        setFetchingDependencies(false)
      }
    } catch (error: any) {
      console.error('Error starting dependency fetch:', error)
      setDependencyWarnings([`Error: ${error.message}. Please add dependencies manually after creation.`])
      setFetchingDependencies(false)
    }
  }

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
      vspVersion,
      manifestData // Include fetched dependencies if available
    }

    await onSubmit(data)

    // If this VSP was created from a completed dependency fetch job,
    // remove the notification from the queue
    if (sourceJobId) {
      console.log('Removing completed dependency job from notifications:', sourceJobId)
      NotificationStore.removeJob(sourceJobId)
    }
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

          {/* Fetch Dependencies Button */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                text={fetchingDependencies ? 'Fetching...' : 'Fetch Dependencies from IG'}
                onClick={handleFetchDependencies}
                disabled={loading || fetchingDependencies || !igCanonical.trim() || !igPackageId.trim()}
                style={{
                  backgroundColor: manifestData ? '#4caf50' : 'var(--theme-400)',
                  width: 'fit-content'
                }}
                loading={fetchingDependencies}
              />
              {fetchingDependencies && (
                <Button
                  text="Cancel"
                  onClick={handleCancelDependencyFetch}
                  style={{
                    backgroundColor: '#9e9e9e',
                    color: 'white',
                    width: 'fit-content'
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Optional: Uses $data-requirements and $infer-manifest-parameters operations to compute dependencies
            </Typography>

            {/* Progress Indicator */}
            {fetchingDependencies && dependencyJobId && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Dependency fetch in progress...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Check the notification bell (🔔) for live progress updates.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  This may take up to 5 minutes. You can close this modal and continue working - you'll be notified when complete.
                </Typography>
              </Alert>
            )}

            {/* Dependency Status */}
            {manifestData && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                <Chip
                  label={`${Object.keys(manifestData.codeSystems).length} CodeSystems`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${Object.keys(manifestData.valueSets).length} ValueSets`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {dependencySource && (
                  <Chip
                    label={dependencySource === 'fhir-operations'
                      ? 'Auto-computed from IG'
                      : `Source: ${dependencySource}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            )}

            {/* Warnings */}
            {dependencyWarnings.length > 0 && (
              <Alert severity={manifestData ? 'info' : 'warning'} sx={{ mt: 1 }}>
                {dependencyWarnings.map((warning, idx) => (
                  <Typography key={idx} variant="body2">
                    {warning}
                  </Typography>
                ))}
              </Alert>
            )}
          </Box>

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
