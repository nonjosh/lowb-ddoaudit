import { ADVENTURE_LOG_API_URL } from './constants'

export interface CompletionEntry {
  finished: boolean
  lastFinishedAt: string | null
  /** Completion timestamps, newest first (up to 10). Used for ransack detection. */
  history: string[]
  levelAtFinish: number | null
  source: 'poll' | 'manual'
}

/** characterId -> questId -> entry */
export type CompletionMap = Record<string, Record<string, CompletionEntry>>

export class WritePasswordRejectedError extends Error {
  constructor() {
    super('Write password rejected')
    this.name = 'WritePasswordRejectedError'
  }
}

interface CompletionsResponse {
  data?: CompletionMap
}

export async function fetchCompletions(signal?: AbortSignal): Promise<CompletionMap> {
  const response = await fetch(`${ADVENTURE_LOG_API_URL}/completions`, { signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch completions (${response.status})`)
  }

  const body = (await response.json()) as CompletionsResponse
  return body.data ?? {}
}

export interface CompletionUpdate {
  characterId: string
  questId: string
  finished: boolean
  /** Omit to keep the stored timestamp, null for "done before tracking". */
  lastFinishedAt?: string | null
  password: string
}

export async function updateCompletion(update: CompletionUpdate): Promise<void> {
  const response = await fetch(
    `${ADVENTURE_LOG_API_URL}/completions/${encodeURIComponent(update.characterId)}/${encodeURIComponent(update.questId)}`,
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
