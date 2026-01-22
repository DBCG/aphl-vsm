import type { NextApiRequest, NextApiResponse } from 'next'
import FhirClient from '@/backend/clients/FhirCdrClient'
import handler from '@/helpers/server/handler'
import { is } from '@/helpers/is'
import Logger from '@/helpers/server/logger'
import { logSimpleError } from '@/helpers/server/simpleHapiError'

interface Query {
  '_id:contains'?: string
  'name:contains'?: string
  'title:contains'?: string
  'version'?: string
  '_offset'?: string
  '_count'?: string
  'status:not'?: string
}

export type VSPApiResponse = {
  vsps: fhir4.Library[]
  total: number
} | { error: string }

const getVSPs = async (req: NextApiRequest, res: NextApiResponse<VSPApiResponse | {}>) => {
  try {
    let queries: Query = {}

    // Build search queries (same pattern as programs)
    if (req.query['id']) {
      queries['_id:contains'] = req.query['id'] as string
    }
    if (req.query['name']) {
      queries['name:contains'] = req.query['name'] as string
    }
    if (req.query['title']) {
      queries['title:contains'] = req.query['title'] as string
    }
    if (req.query['version']) {
      queries['version'] = req.query['version'] as string
    }
    if (req.query['offset']) {
      queries['_offset'] = req.query['offset'] as string
    }
    if (req.query['count']) {
      queries['_count'] = req.query['count'] as string
    }
    if (req.query['showRetired'] === 'false') {
      queries['status:not'] = 'retired'
    }

    // Search for VSPs (useContext = value-set-package)
    const libSearchResult = await FhirClient.getInstance().search({
      resourceType: 'Library',
      options: {
        headers: {
          'Cache-control': 'no-cache, no-store, must-revalidate'
        }
      },
      searchParams: {
        context: 'value-set-package',  // This searches useContext
        _sort: ['-_lastUpdated'],
        _total: 'accurate',
        // Same elements as programs for consistency
        _elements: [
          'date',
          'description',
          'contained',
          'approvalDate',
          'extension',
          'effectivePeriod',
          'experimental',
          'meta',
          'name',
          'publisher',
          'status',
          'title',
          'type',
          'url',
          'useContext',
          'version',
          'relatedArtifact'
        ],
        ...queries
      }
    })

    // Filter to only VSPs using type guard
    let vsps = libSearchResult.entry?.filter((i: any) => is.isVSP(i.resource)).map((i: any) => i.resource as fhir4.Library) || []

    // Apply IG filter if provided (client-side post-processing)
    const igUrl = req.query['ig-url'] as string | undefined
    // Filter out the string "undefined" which can come from URL params
    if (igUrl && igUrl !== 'undefined') {
      Logger.getLogger().info('Applying IG filter: ' + igUrl)
      vsps = vsps.filter((vsp: fhir4.Library) => {
        const composedOfArtifacts = vsp.relatedArtifact?.filter((ra) => ra.type === 'composed-of') || []
        return composedOfArtifacts.some((ra) => {
          const resource = ra.resource || ''
          // Match exact canonical or canonical without version
          return resource === igUrl || resource.startsWith(`${igUrl.split('|')[0]}|`)
        })
      })
      Logger.getLogger().info('After IG filter: ' + vsps.length + ' VSPs')
    }

    // Set cache headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    return res.status(200).json({
      vsps: vsps,
      total: igUrl ? vsps.length : (libSearchResult.total || 0)
    })
  } catch (error: any) {
    Logger.getLogger().error('Error fetching VSPs:', error)
    logSimpleError(error)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    return res.status(500).json({ error: error.message || 'Failed to fetch Value Set Packages' })
  }
}

export default handler({
  GET: { access: ['admin', 'editor', 'reviewer'], action: getVSPs }
})
