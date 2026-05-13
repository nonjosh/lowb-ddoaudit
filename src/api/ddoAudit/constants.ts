export const DDOAUDIT_BASE_URL = 'https://api.ddoaudit.com/v1'
export const DDOAUDIT_QUESTS_URL = `${DDOAUDIT_BASE_URL}/quests?force=false`
export const DDOAUDIT_AREAS_URL = `${DDOAUDIT_BASE_URL}/areas?force=false`

// Backward-compatible aliases used by the shared quest and area loaders.
export const QUESTS_JSON_URL = DDOAUDIT_QUESTS_URL
export const AREAS_JSON_URL = DDOAUDIT_AREAS_URL

export const MAX_CHARACTER_IDS_PER_REQUEST = 30

export const HOUR_IN_MS = 60 * 60 * 1000
export const DDOAUDIT_JSON_CACHE_TTL_MS = 24 * HOUR_IN_MS
// User-specified lockout duration: 2 days + 18 hours.
export const RAID_LOCKOUT_MS = (2 * 24 + 18) * HOUR_IN_MS
