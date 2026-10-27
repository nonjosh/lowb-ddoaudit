/**
 * Runtime configuration. Values come from Cloud Run env vars; the write password
 * is injected from Secret Manager and never logged.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function list(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function positiveInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name] ?? fallback)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const config = {
  port: positiveInt('PORT', 8080),
  ddoApiBaseUrl: process.env.DDO_API_BASE_URL ?? 'https://api.ddoaudit.com/v1',
  // Comma-separated character ids to poll. Not a secret, but deployment-specific.
  trackedCharacterIds: list('TRACKED_CHARACTER_IDS'),
  // Shared write password, mounted from Secret Manager.
  get writePassword(): string {
    return required('LOG_WRITE_PASSWORD')
  },
  // Public URL of this service, used as the expected OIDC audience.
  serviceUrl: process.env.SERVICE_URL ?? '',
  // Service account email Cloud Scheduler uses; only it may trigger /poll.
  schedulerServiceAccount: process.env.SCHEDULER_SA_EMAIL ?? '',
  allowedOrigins: list('ALLOWED_ORIGINS'),
  // Two consecutive samples (~2 minutes at a 1/min poll) before a visit counts.
  minSamples: positiveInt('MIN_SAMPLES', 2),
  // Minimum level-distance gap when an area holds several quests.
  levelMargin: positiveInt('LEVEL_MARGIN', 4),
}

export const catalogTtlMs = 6 * 60 * 60 * 1000
