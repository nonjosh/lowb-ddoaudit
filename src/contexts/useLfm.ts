import { createContext, useContext } from 'react'
import { LfmItem } from '@/api/ddoAudit'

export interface ServerInfo {
  players: number | null
  isOnline: boolean | null
}

export interface LfmContextType {
  lfms: Record<string, LfmItem>
  loading: boolean
  error: string
  serverInfo: ServerInfo
  lastUpdatedAt: Date | null
  refresh: () => Promise<void>
}

export const LfmContext = createContext<LfmContextType | null>(null)

export function useLfm() {
  const context = useContext(LfmContext)
  if (!context) throw new Error('useLfm must be used within LfmProvider')
  return context
}
