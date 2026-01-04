import { createContext, ReactNode, useContext, useState } from 'react'

interface ConfigContextType {
  showClassIcons: boolean
  setShowClassIcons: (value: boolean | ((prev: boolean) => boolean)) => void
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showClassIcons, setShowClassIcons] = useState(true)

  return (
    <ConfigContext.Provider value={{ showClassIcons, setShowClassIcons }}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfig must be used within ConfigProvider')
  return context
}