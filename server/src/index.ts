import { timingSafeEqual } from 'node:crypto'

import express, { type NextFunction, type Request, type Response } from 'express'
import { OAuth2Client } from 'google-auth-library'

import { isQuestBand } from './bands.js'
import { config } from './config.js'
import { getCatalog } from './ddo.js'
import { runPoll } from './poller.js'
import { deleteRemark, listRemarksJson, parseCharacterId, parseRemarkInput, saveRemark } from './remarks.js'
import {
  applyManualEdit,
  applyManualEdits,
  completionsRevision,
  listCompletionsJson,
  listReincarnations,
  loadPollerState,
  recordReincarnation,
  resetCompletionsForLife,
  type ManualEdit,
} from './store.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '128kb' }))

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
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
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

type RawEdit = {
  characterId?: unknown
  questId?: unknown
  band?: unknown
  finished?: unknown
  lastFinishedAt?: unknown
}

type ParsedEdit = { ok: true; edit: ManualEdit } | { ok: false; message: string }

function parseEdit(raw: RawEdit, catalog: Awaited<ReturnType<typeof getCatalog>>): ParsedEdit {
  const characterId = typeof raw.characterId === 'string' ? raw.characterId : ''
  const questId = typeof raw.questId === 'string' ? raw.questId : ''
  const band = typeof raw.band === 'string' ? raw.band : ''

  if (!config.trackedCharacterIds.includes(characterId)) return { ok: false, message: 'Unknown character' }
  if (!isQuestBand(band)) return { ok: false, message: 'Unknown version' }
  if (!catalog.questById.get(questId)) return { ok: false, message: 'Unknown quest' }
  if (typeof raw.finished !== 'boolean') return { ok: false, message: 'finished must be a boolean' }

  let lastFinishedAt: Date | null | undefined
  if (raw.lastFinishedAt !== undefined) {
    if (raw.lastFinishedAt === null) {
      lastFinishedAt = null
    } else if (typeof raw.lastFinishedAt === 'string') {
      const parsed = new Date(raw.lastFinishedAt)
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, message: 'lastFinishedAt must be an ISO date or null' }
      }
      if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        return { ok: false, message: 'lastFinishedAt cannot be in the future' }
      }
      lastFinishedAt = parsed
    } else {
      return { ok: false, message: 'lastFinishedAt must be an ISO date or null' }
    }
  }

  return {
    ok: true,
    edit: { characterId, questId, band, finished: raw.finished, lastFinishedAt, level: null },
  }
}

const MAX_BULK_EDITS = 100

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
    const body = await listCompletionsJson()
    response.setHeader('Cache-Control', 'no-store')
    response.type('application/json').send(body)
  }),
)

app.get(
  '/reincarnations',
  asyncRoute(async (_request, response) => {
    const data = await listReincarnations()
    response.setHeader('Cache-Control', 'no-store')
    response.json({ data })
  }),
)

/** One document read: lets the page poll for changes without re-reading the log. */
app.get(
  '/revision',
  asyncRoute(async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.json({ data: { revision: await completionsRevision() } })
  }),
)

app.post(
  '/reincarnations/:characterId',
  asyncRoute(async (request, response) => {
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    const { characterId } = request.params
    if (!config.trackedCharacterIds.includes(characterId)) {
      response.status(400).json({ message: 'Unknown character' })
      return
    }

    const body = request.body as { at?: unknown }
    let at = new Date()
    if (body?.at !== undefined) {
      if (typeof body.at !== 'string') {
        response.status(400).json({ message: 'at must be an ISO date' })
        return
      }
      const parsed = new Date(body.at)
      if (Number.isNaN(parsed.getTime())) {
        response.status(400).json({ message: 'at must be an ISO date' })
        return
      }
      if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        response.status(400).json({ message: 'at cannot be in the future' })
        return
      }
      at = parsed
    }

    // Record first, then re-derive the checkboxes with the time actually in force
    // (an earlier request is ignored rather than rewinding the boundary).
    const { recorded, effectiveAt } = await recordReincarnation(characterId, at, 'manual')
    const reset = await resetCompletionsForLife(characterId, effectiveAt, 'manual')

    response.json({
      data: { at: effectiveAt.toISOString(), unchecked: reset, recorded },
    })
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

app.get(
  '/remarks',
  asyncRoute(async (request, response) => {
    // Notes are opinions about named players, so reading them needs the password too.
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    response.setHeader('Cache-Control', 'no-store')
    response.type('application/json').send(await listRemarksJson())
  }),
)

app.put(
  '/remarks/:characterId',
  asyncRoute(async (request, response) => {
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    const parsed = parseRemarkInput(request.params.characterId, request.body)
    if (!parsed.ok) {
      response.status(400).json({ message: parsed.message })
      return
    }

    response.json({ data: await saveRemark(parsed.value) })
  }),
)

app.delete(
  '/remarks/:characterId',
  asyncRoute(async (request, response) => {
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    const id = parseCharacterId(request.params.characterId)
    if (!id.ok) {
      response.status(400).json({ message: id.message })
      return
    }

    await deleteRemark(id.value)
    response.status(204).end()
  }),
)

app.patch(
  '/completions/bulk',
  asyncRoute(async (request, response) => {
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    const body = request.body as { updates?: unknown }
    if (!Array.isArray(body?.updates) || body.updates.length === 0) {
      response.status(400).json({ message: 'updates must be a non-empty array' })
      return
    }
    if (body.updates.length > MAX_BULK_EDITS) {
      response.status(400).json({ message: `at most ${MAX_BULK_EDITS} updates per request` })
      return
    }

    const catalog = await getCatalog()
    const edits: ManualEdit[] = []
    for (const raw of body.updates) {
      const parsed = parseEdit((raw ?? {}) as RawEdit, catalog)
      if (!parsed.ok) {
        response.status(400).json({ message: parsed.message })
        return
      }
      edits.push(parsed.edit)
    }

    const updated = await applyManualEdits(edits)
    response.json({ data: { updated } })
  }),
)

app.patch(
  '/completions/:characterId/:questId/:band',
  asyncRoute(async (request, response) => {
    if (!passwordMatches(request.header('x-log-password'), config.writePassword)) {
      response.status(401).json({ message: 'Invalid password' })
      return
    }

    const catalog = await getCatalog()
    const parsed = parseEdit(
      {
        characterId: request.params.characterId,
        questId: request.params.questId,
        band: request.params.band,
        ...(request.body as { finished?: unknown; lastFinishedAt?: unknown }),
      },
      catalog,
    )

    if (!parsed.ok) {
      response.status(400).json({ message: parsed.message })
      return
    }

    await applyManualEdit(parsed.edit)
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
