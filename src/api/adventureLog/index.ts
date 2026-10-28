import { ADVENTURE_LOG_API_URL } from './constants'

export interface CompletionEntry {
  finished: boolean
  lastFinishedAt: string | null
  /** Completion timestamps, newest first (up to 10). Used for ransack detection. */
  history: string[]
  levelAtFinish: number | null
  source: 'poll' | 'manual'
}

/** characterId -> `${questId}:${band}` -> entry */
export type CompletionMap = Record<string, Record<string, CompletionEntry>>

export interface ActivityEntry {
  areaId: string | null
  questId: string | null
  since: string
}

/** characterId -> where the poller last saw them. */
export type ActivityMap = Record<string, ActivityEntry>

export class WritePasswordRejectedError extends Error {
  constructor() {
    super('Write password rejected')
    this.name = 'WritePasswordRejectedError'
  }
}

interface CompletionsResponse {
  data?: CompletionMap
}

interface ActivityResponse {
  data?: ActivityMap
}

export async function fetchCompletions(signal?: AbortSignal): Promise<CompletionMap> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/completions`, { signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch completions (${response.status})`)
  }

  const body = (await response.json()) as CompletionsResponse
  return body.data ?? {}
}

export async function fetchActivity(signal?: AbortSignal): Promise<ActivityMap> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/activity`, { signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch activity (${response.status})`)
  }

  const body = (await response.json()) as ActivityResponse
  return body.data ?? {}
}

export interface CompletionUpdate {
  characterId: string
  questId: string
  /** heroic | epic | legendary — one row per version of the quest. */
  band: string
  finished: boolean
  /** Omit to keep the stored timestamp, null for "no data". */
  lastFinishedAt?: string | null
  password: string
}

export interface BulkCompletionUpdate {
  characterId: string
  items: Array<{ questId: string; band: string; finished: boolean }>
  password: string
}

/** Marks several rows in one request so a group toggle is a single round-trip. */
export async function updateCompletionsBulk(update: BulkCompletionUpdate): Promise<number> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/completions/bulk`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-log-password': update.password,
    },
    body: JSON.stringify({
      updates: update.items.map((item) => ({ characterId: update.characterId, ...item })),
    }),
  })

  if (response.status === 401) throw new WritePasswordRejectedError()
  if (!response.ok) throw new Error(`Failed to update completions (${response.status})`)

  const body = (await response.json()) as { data?: { updated?: number } }
  return body.data?.updated ?? 0
}

export async function updateCompletion(update: CompletionUpdate): Promise<void> {
  const response = await fetch(
    `${ADVENTURE_LOG_API_URL}/completions/${encodeURIComponent(update.characterId)}/${encodeURIComponent(update.questId)}/${encodeURIComponent(update.band)}`,
    {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-log-password': update.password,
      },
      body: JSON.stringify({
        finished: update.finished,
        ...(update.lastFinishedAt === undefined ? {} : { lastFinishedAt: update.lastFinishedAt }),
      }),
    },
  )

  if (response.status === 401) throw new WritePasswordRejectedError()
  if (!response.ok) {
    throw new Error(`Failed to update completion (${response.status})`)
  }
}
