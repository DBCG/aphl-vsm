import { JobData, ReleaseJobMetadata } from '@/types/jobTypes'

/**
 * Order notification queue entries by creation time (the order jobs were kicked off).
 *
 * Bull job ids are per-queue counters, so each queue (releaseVSP, vspPackage,
 * ChangeLogQueue, …) has its own independent sequence starting at 1. Sorting by job id
 * therefore interleaves those sequences and does not reflect call order. `createdAt`
 * gives a single global ordering. Jobs created before `createdAt` was tracked fall back
 * to the numeric job id so they still sort deterministically.
 */
export const compareJobsByCreation = (
  a: [string, JobData],
  b: [string, JobData]
): number => {
  const ta = Number(a[1]?.createdAt) || 0
  const tb = Number(b[1]?.createdAt) || 0
  if (ta !== tb) return ta - tb
  return (Number(a[0]) || 0) - (Number(b[0]) || 0)
}

/**
 * Build the detail-page route for a release-completion link.
 *
 * VSP releases set `basePath` to '/value-set-packages'; program releases leave it unset
 * and fall back to '/programs'. Routing a VSP to '/programs/<id>' is what crashed the app
 * (the Programs page fails to fetch program data for a VSP id), so VSP releases must carry
 * their own base path.
 */
export const getReleaseRoute = (metadata?: Partial<ReleaseJobMetadata>): string => {
  const basePath = metadata?.basePath || '/programs'
  const programId = metadata?.programId || ''
  return `${basePath}/${programId}`
}
