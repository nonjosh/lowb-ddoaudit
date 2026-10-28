import { timingSafeEqual } from 'node:crypto'

import express, { type NextFunction, type Request, type Response } from 'express'
import { OAuth2Client } from 'google-auth-library'

import { isQuestBand } from './bands.js'
import { config } from './config.js'
import { getCatalog } from './ddo.js'
import { runPoll } from './poller.js'
import { applyManualEdit, listCompletions, loadPollerState } from './store.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))

const oidcClient = new OAuth2Client()

function passwordMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
}

function applyCors(request: Request, response: Response): void {
  const origin = request.header('origin')
  if (origin && config.allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'content-type, x-log-password')
  response.setHeader('Access-Control-Max-Age', '600')
}

app.use((request, response, next) => {
  applyCors(request, response)
  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }
  next()
})

const asyncRoute =
  (handler: (request: Request, response: Response) => Promise<void>) =>
  (request: Request, response: Response, next: NextFunction): void => {
    handler(request, response).catch(next)
  }

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get(
  '/completions',
  asyncRoute(async (_request, response) => {
    const data = await listCompletions()
    response.setHeader('Cache-Control', 'no-store')
    response.json({ data })
  }),
)

app.get(
  '/activity',
  asyncRoute(async (_request, response) => {
    const state = await loadPollerState()
    const data: Record<string, { areaId: string | null; questId: string | null; since: string }> = {}
    for (const [characterId, character] of Object.entries(state.characters)) {
      data[characterId] = {
        areaId: character.areaId,
        questId: character.questId,
        since: character.since,
      }
    }
    response.setHeader('Cache-Control', 'no-store')
    response.json({ data, polledAt: state.lastPollAt })
  }),
)

app.patch(
  '/completions/:characterId/:questId/:band',
  asyncRoute(async (request, response) => {
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    const { characterId, questId } = request.params
    const band = request.params.band
    if (!isQuestBand(band)) {
      response.status(400).json({ message: 'Unknown version' })
      return
    }
    if (!config.trackedCharacterIds.includes(characterId)) {
      response.status(400).json({ message: 'Unknown character' })
      return
    }

    const catalog = await getCatalog()
    const quest = catalog.questById.get(questId)
    if (!quest) {
      response.status(400).json({ message: 'Unknown quest' })
      return
    }

    const body = request.body as { finished?: unknown; lastFinishedAt?: unknown }
    if (typeof body?.finished !== 'boolean') {
      response.status(400).json({ message: 'finished must be a boolean' })
      return
    }

    let lastFinishedAt: Date | null | undefined
    if (body.lastFinishedAt !== undefined) {
      if (body.lastFinishedAt === null) {
        lastFinishedAt = null
      } else if (typeof body.lastFinishedAt === 'string') {
        const parsed = new Date(body.lastFinishedAt)
        if (Number.isNaN(parsed.getTime())) {
          response.status(400).json({ message: 'lastFinishedAt must be an ISO date or null' })
          return
        }
        // A far-future timestamp would permanently block the poller for this row.
        if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
          response.status(400).json({ message: 'lastFinishedAt cannot be in the future' })
          return
        }
        lastFinishedAt = parsed
      } else {
        response.status(400).json({ message: 'lastFinishedAt must be an ISO date or null' })
        return
      }
    }

    await applyManualEdit({
      characterId,
      questId,
      band,
      finished: body.finished,
      lastFinishedAt,
      // Manual edits carry no character level; the poll path owns that field.
      level: null,
    })

    response.status(204).end()
  }),
)

async function authorizeScheduler(request: Request): Promise<boolean> {
  if (!config.serviceUrl || !config.schedulerServiceAccount) return false
  const header = request.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return false

  try {
    const ticket = await oidcClient.verifyIdToken({ idToken: token, audience: config.serviceUrl })
    const payload = ticket.getPayload()
    return payload?.email_verified === true && payload.email === config.schedulerServiceAccount
  } catch {
    return false
  }
}

app.post(
  '/poll',
  asyncRoute(async (request, response) => {
    if (!(await authorizeScheduler(request))) {
      response.status(401).json({ message: 'Unauthorized' })
      return
    }

    const result = await runPoll()
    console.log('poll', JSON.stringify(result))
    response.json({ data: result })
  }),
)

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if ((error as { type?: string } | null)?.type === 'entity.parse.failed') {
    response.status(400).json({ message: 'Invalid JSON body' })
    return
  }
  console.error('request failed', error)
  response.status(500).json({ message: 'Internal error' })
})

app.listen(config.port, () => {
  // Logged so a character-list drift against src/data/character_ids.csv is visible.
  console.log(`ddo-log-api listening on ${config.port} (tracked characters: ${config.trackedCharacterIds.length})`)
})
