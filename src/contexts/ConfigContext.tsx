import { ReactNode, useState } from 'react'
import { ConfigContext } from './useConfig'

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [showClassIcons, setShowClassIcons] = useState(true)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  return (
    <ConfigContext.Provider value={{ showClassIcons, setShowClassIcons, autoRefreshEnabled, setAutoRefreshEnabled }}>
      {children}
    </ConfigContext.Provider>
  )
}
