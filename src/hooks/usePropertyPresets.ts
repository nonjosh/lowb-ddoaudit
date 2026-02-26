import { useCallback, useEffect, useRef, useState } from 'react'

import { gearPlannerDb, SavedPropertyPreset } from '@/storage/gearPlannerDb'

export interface UsePropertyPresetsReturn {
  presets: SavedPropertyPreset[]
  activePresetId: number | null
  isLoaded: boolean
  selectPreset: (id: number | null) => void
  savePreset: (name: string, properties: string[], sets: string[]) => Promise<number>
  updatePreset: (id: number, properties: string[], sets: string[]) => Promise<void>
  renamePreset: (id: number, name: string) => Promise<void>
  deletePreset: (id: number) => Promise<void>
}

export function usePropertyPresets(): UsePropertyPresetsReturn {
  const [presets, setPresets] = useState<SavedPropertyPreset[]>([])
  const [activePresetId, setActivePresetId] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const initializedRef = useRef(false)

  // Load presets from DB on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      const allPresets = await gearPlannerDb.propertyPresets
        .orderBy('updatedAt').reverse().toArray()
      setPresets(allPresets)
      setIsLoaded(true)
    }
    void init()
  }, [])

  const selectPreset = useCallback((id: number | null) => {
    setActivePresetId(id)
  }, [])

  const savePreset = useCallback(async (name: string, properties: string[], sets: string[]) => {
    const now = Date.now()
    const id = await gearPlannerDb.propertyPresets.add({
      name,
      createdAt: now,
      updatedAt: now,
      properties,
      sets
    })
    const newPreset: SavedPropertyPreset = {
      id: id as number,
      name,
      createdAt: now,
      updatedAt: now,
      properties,
      sets
    }
    setPresets(prev => [...prev, newPreset])
    setActivePresetId(id as number)
    return id as number
  }, [])

  const updatePreset = useCallback(async (id: number, properties: string[], sets: string[]) => {
    const now = Date.now()
    await gearPlannerDb.propertyPresets.update(id, {
      properties,
      sets,
      updatedAt: now
    })
    setPresets(prev => prev.map(p => p.id === id ? { ...p, properties, sets, updatedAt: now } : p))
  }, [])

  const renamePreset = useCallback(async (id: number, name: string) => {
    await gearPlannerDb.propertyPresets.update(id, { name, updatedAt: Date.now() })
    setPresets(prev => prev.map(p => p.id === id ? { ...p, name } : p))
  }, [])

  const deletePreset = useCallback(async (id: number) => {
    await gearPlannerDb.propertyPresets.delete(id)
    setPresets(prev => prev.filter(p => p.id !== id))
    setActivePresetId(prev => prev === id ? null : prev)
  }, [])

  return {
    presets,
    activePresetId,
    isLoaded,
    selectPreset,
    savePreset,
    updatePreset,
    renamePreset,
    deletePreset
  }
}
