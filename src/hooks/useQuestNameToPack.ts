import { useEffect, useMemo, useState } from 'react'

import { fetchQuestsById, Quest } from '@/api/ddoAudit'

/**
 * Hook that returns a Map of quest name → adventure pack name.
 * Uses the cached fetchQuestsById so multiple consumers don't trigger extra fetches.
 */
export function useQuestNameToPack(): Map<string, string> {
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})

  useEffect(() => {
    fetchQuestsById().then(setQuestsById).catch(console.error)
  }, [])

  return useMemo(() => {
    const map = new Map<string, string>()
    Object.values(questsById).forEach(q => {
      if (q.name && q.required_adventure_pack) {
        map.set(q.name, q.required_adventure_pack)
      }
    })
    return map
  }, [questsById])
}
