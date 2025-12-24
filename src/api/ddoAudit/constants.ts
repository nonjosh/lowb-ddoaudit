export const DDOAUDIT_BASE_URL = 'https://api.ddoaudit.com/v1'
export const QUESTS_JSON_URL = import.meta.env.BASE_URL + 'data/quests.json'
export const AREAS_JSON_URL = import.meta.env.BASE_URL + 'data/areas.json'

export const MAX_CHARACTER_IDS_PER_REQUEST = 30

export const HOUR_IN_MS = 60 * 60 * 1000
// User-specified lockout duration: 2 days + 18 hours.
export const RAID_LOCKOUT_MS = (2 * 24 + 18) * HOUR_IN_MS
