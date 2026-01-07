import { createContext, ReactNode, useContext, useState } from 'react'

interface ConfigContextType {
  showClassIcons: boolean
  setShowClassIcons: (value: boolean | ((prev: boolean) => boolean)) => void
  autoRefreshEnabled: boolean
  setAutoRefreshEnabled: (value: boolean | ((prev: boolean) => boolean)) => void
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [showClassIcons, setShowClassIcons] = useState(true)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  return (
    <ConfigContext.Provider value={{ showClassIcons, setShowClassIcons, autoRefreshEnabled, setAutoRefreshEnabled }}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfig must be used within ConfigProvider')
  return context
}