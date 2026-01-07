import { createContext, useContext } from 'react'

export interface ConfigContextType {
  showClassIcons: boolean
  setShowClassIcons: (value: boolean | ((prev: boolean) => boolean)) => void
  autoRefreshEnabled: boolean
  setAutoRefreshEnabled: (value: boolean | ((prev: boolean) => boolean)) => void
}

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfig must be used within ConfigProvider')
  return context
}
