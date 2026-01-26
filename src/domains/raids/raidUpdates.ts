/**
 * Mapping of raid names to their update version codes.
 * Key: normalized raid name (lowercase, spaces replaced with single space)
 * Value: update version string (e.g., "U75.7")
 */
const RAID_UPDATE_MAP: Record<string, string> = {
  // 2025-2026 Releases
  'relentless': 'U75.7',
  'den of vipers': 'U72.1',
  'threats old and new': 'U69.3',

  // Legendary & Standalone Raids
  'legendary chronoscope': 'U72',
  'legendary lord of blades': 'U50',
  'legendary master artificer': 'U50',
  'legendary vision of destruction': 'U46.3',
  'legendary hound of xoriat': 'U29',
  'legendary tempest spine': 'U29',
  "legendary tempest's spine": 'U29',
  'hunt or be hunted': 'U51',

  // Vecna Unleashed Raids
  'fire over morgrave': 'U61',

  // Isle of Dread Raids
  'skeletons in the closet': 'U55',

  // Fables of the Feywild Raids
  'the dryad and the demigod': 'U48',

  // Masterminds of Sharn Raids
  'project nemesis': 'U42.2',
  'too hot to handle': 'U42.4',

  // Mists of Ravenloft Raids
  'the curse of strahd': 'U37',
  "old baba's hut": 'U38',

  // Dragonblood Prophecy Raids
  'killing time': 'U39',
  'riding the storm out': 'U36',

  // Older Legacy Raids
  'defiler of the just': 'U26',
  'fire on thunder peak': 'U22',
  'temple of the deathwyrm': 'U22',
  'the mark of death': 'U23',
  'the fall of truth': 'U16',
  'caught in the web': 'U14',
}

/**
 * Normalizes a raid name to match the lookup key format.
 */
function normalizeRaidName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Gets the update version for a raid name.
 * @param raidName The display name of the raid
 * @returns The update version string (e.g., "U75") or null if not found
 */
export function getRaidUpdate(raidName: string | null | undefined): string | null {
  const key = normalizeRaidName(raidName)
  const fullVersion = RAID_UPDATE_MAP[key]
  if (!fullVersion) return null

  // Return only the major version (e.g., "U72.1" -> "U72")
  return fullVersion.split('.')[0]
}
