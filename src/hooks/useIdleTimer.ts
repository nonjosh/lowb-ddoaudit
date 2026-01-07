import { useCallback, useEffect, useRef, useState } from 'react'

import { useConfig } from '../contexts/ConfigContext'

export function useIdleTimer() {
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const { setAutoRefreshEnabled } = useConfig()
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }
    idleTimeoutRef.current = setTimeout(() => {
      setAutoRefreshEnabled(false)
      setShowIdleWarning(true)
    }, 2 * 60 * 60 * 1000) // 2 hours
  }, [setAutoRefreshEnabled])

  const handleIdleWarningReEnable = useCallback(() => {
    setAutoRefreshEnabled(true)
    setShowIdleWarning(false)
    resetIdleTimer()
  }, [resetIdleTimer, setAutoRefreshEnabled])

  const handleIdleWarningClose = useCallback(() => {
    setShowIdleWarning(false)
  }, [])

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled((prev) => {
      const newValue = !prev
      if (newValue) {
        resetIdleTimer()
      }
      return newValue
    })
  }, [resetIdleTimer, setAutoRefreshEnabled])

  useEffect(() => {
    // Set up idle detection
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    const resetTimer = () => resetIdleTimer()
    events.forEach(event => document.addEventListener(event, resetTimer, true))
    resetIdleTimer() // Start the timer initially

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer, true))
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
    }
  }, [resetIdleTimer])

  return {
    showIdleWarning,
    resetIdleTimer,
    handleIdleWarningReEnable,
    handleIdleWarningClose,
    handleToggleAutoRefresh,
  }
}