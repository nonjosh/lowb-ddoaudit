/**
 * Mapping of rune item names (from Trove inventory) to raid quest names.
 * Used to display the number of available runes for each raid.
 */

/** Map of rune name → raid name */
const RUNE_TO_RAID: Record<string, string> = {
  'Ceremony Rune': 'Fire Over Morgrave',
  'Karliath Rune': 'Threats Old and New',
  'Draconic Rune': 'Old Baba\'s Hut',
  'Hag Rune': 'Old Baba\'s Hut',
  'Strahd Rune': 'The Curse of Strahd',
  'Dryad Rune': 'Project Nemesis',
  'Titan Rune': 'The Mark of Death',
  'Sharn Rune': 'Too Hot to Handle',
  'Beacon Rune': 'Legendary Tempest\'s Spine',
  'Spider Rune': 'Kill Count',
}

/** Inverse map: raid name → list of rune names */
const RAID_TO_RUNES: Map<string, string[]> = new Map()
for (const [runeName, raidName] of Object.entries(RUNE_TO_RAID)) {
  const existing = RAID_TO_RUNES.get(raidName)
  if (existing) {
    existing.push(runeName)
  } else {
    RAID_TO_RUNES.set(raidName, [runeName])
  }
}

/**
 * Get the rune names associated with a raid.
 * @returns Array of rune names, or empty array if no runes for this raid.
 */
export function getRuneNamesForRaid(raidName: string): string[] {
  return RAID_TO_RUNES.get(raidName) ?? []
}
