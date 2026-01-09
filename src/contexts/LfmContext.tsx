import { ReactNode, useCallback, useRef, useState } from 'react'

import { fetchLfms, fetchServerInfo, LfmItem } from '@/api/ddoAudit'
import { LfmContext, ServerInfo } from './useLfm'

export function LfmProvider({ children }: { children: ReactNode }) {
  const [lfms, setLfms] = useState<Record<string, LfmItem>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [serverInfo, setServerInfo] = useState<ServerInfo>({ players: null, isOnline: null })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')

    try {
      // Always fetch server info first
      const info = await fetchServerInfo('shadowdale', { signal: controller.signal }).catch(() => null)
      const currentServerInfo = {
        isOnline: info?.is_online ?? null,
        players: info?.character_count ?? null
      }
      setServerInfo(currentServerInfo)

      if (currentServerInfo.isOnline === false) {
        setError('Server is offline. LFM data is unavailable.')
        setLfms({})
      } else {
        const result = await fetchLfms('shadowdale', { signal: controller.signal })
          .then((data) => ({ data, error: null }))
          .catch((e: Error) => ({ data: null, error: e }))

        if (result.error) {
          setError(result.error.message ?? String(result.error))
        } else {
          setLfms(result.data ?? {})
        }
      }
      setLastUpdatedAt(new Date())
    } catch (e) {
      const error = e as Error
      if (error?.name === 'AbortError') return
      setError(error?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <LfmContext.Provider
      value={{
        lfms,
        loading,
        error,
        serverInfo,
        lastUpdatedAt,
        refresh,
      }}
    >
      {children}
    </LfmContext.Provider>
  )
}
