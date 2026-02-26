import { useEffect, useState } from 'react'

import { fetchQuestsById } from '@/api/ddoAudit'
import { buildRaidQuestNames } from '@/domains/quests/questHelpers'

/**
 * Hook that returns a Set of quest names that are raids.
 * Uses the cached fetchQuestsById so multiple consumers don't trigger extra fetches.
 */
export function useRaidQuestNames(): Set<string> {
  const [raidNames, setRaidNames] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchQuestsById()
      .then((questsById) => setRaidNames(buildRaidQuestNames(questsById)))
      .catch(console.error)
  }, [])

  return raidNames
}
