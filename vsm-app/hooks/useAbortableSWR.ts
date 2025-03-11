import useSWR, { SWRConfiguration, SWRResponse } from 'swr'
import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface UseAbortableSWROptions<Data = any, Error = any> extends SWRConfiguration<Data, Error> {
  fetchOptions?: RequestInit
  debug?: boolean
}

type UseAbortableSWRReturn<Data = any, Error = any> = SWRResponse<Data, Error>

function useAbortableSWR<Data = any, Error = any>(
  url: string | null,
  options: UseAbortableSWROptions<Data, Error> = {}
): UseAbortableSWRReturn<Data, Error> {
  const router = useRouter()
  const [isRouteChanging, setIsRouteChanging] = useState<boolean>(false)
  const controllerRef = useRef<AbortController | null>(null)

  // Track request IDs to handle React Strict Mode's double-mounting
  const requestIdRef = useRef<number>(0)
  const [isClient, setIsClient] = useState<boolean>(false)
  const { debug = false } = options

  // Only enable on client-side after hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  const fetcher = async (fetchUrl: string): Promise<Data | undefined> => {
    if (!fetchUrl) return undefined

    // Generate a unique ID for this request
    const currentRequestId = ++requestIdRef.current

    if (debug) {
      console.log(`[useAbortableSWR] Starting request #${currentRequestId} for ${fetchUrl}`)
    }

    // Only abort previous requests when not route changing
    if (!isRouteChanging && controllerRef.current) {
      if (debug) {
        console.log(`[useAbortableSWR] *********Aborting previous request for ${fetchUrl}`)
      }
      controllerRef.current.abort()
    }

    // Create new controller
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const response = await fetch(fetchUrl, {
        signal: controller.signal,
        ...options.fetchOptions
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      // If this isn't the most recent request, don't return the data
      // This prevents race conditions from Strict Mode's double-mounting
      if (currentRequestId !== requestIdRef.current) {
        if (debug) {
          console.log(`[useAbortableSWR] Ignoring stale request #${currentRequestId}`)
        }
        return undefined
      }

      const data = await response.json()

      if (debug) {
        console.log(`[useAbortableSWR] Request #${currentRequestId} completed successfully`)
      }

      return data as Data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (debug) {
          console.log(`[useAbortableSWR] Request to ${fetchUrl} was aborted`)
        }
        // Return undefined for aborted requests, letting SWR handle it gracefully
        return undefined
      }
      throw error
    }
  }

  // Route change listeners
  useEffect(() => {
    const handleRouteChangeStart = () => {
      if (debug) {
        console.log('[useAbortableSWR] Route change started')
      }
      setIsRouteChanging(true)
    }

    const handleRouteChangeComplete = () => {
      if (debug) {
        console.log('[useAbortableSWR] Route change completed')
      }
      setIsRouteChanging(false)
    }

    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    router.events.on('routeChangeError', handleRouteChangeComplete)

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      router.events.off('routeChangeError', handleRouteChangeComplete)
    }
  }, [router, debug])

  // Cleanup on unmount
  useEffect(() => {
    // Keep track of whether this is an active instance
    const localRequestId = requestIdRef.current

    if (debug) {
      console.log(`[useAbortableSWR] Component mounted with request ID: ${localRequestId}`)
    }

    return () => {
      // Only perform cleanup if this is the most recent instance
      // This prevents Strict Mode's second unmount from affecting the real instance
      if (localRequestId === requestIdRef.current && controllerRef.current) {
        if (debug) {
          console.log(`[useAbortableSWR] Cleaning up request ID: ${localRequestId}`)
        }
        controllerRef.current.abort()
      }
    }
  }, [debug])

  // @ts-ignore
  return useSWR<Data, Error>(isClient ? url : null, fetcher, {
    ...options
  })
}

export default useAbortableSWR
