/**
 * Mapping of rune item names (from Trove inventory) to raid quest names.
 * Used to display the number of available runes for each raid.
 *
 * Rune names and their raid associations are verified from in-game item descriptions.
 */

/** Map of rune name → raid name */
const RUNE_TO_RAID: Record<string, string> = {
  'Artificer Rune': 'Legendary Master Artificer',
  'Blades Rune': 'Legendary Lord of Blades',
  'Ceremony Rune': 'Fire Over Morgrave',
  'Chronoscope Rune': 'The Chronoscope (Legendary)',
  'Codex Rune': 'The Codex and the Shroud',
  'Death Rune': 'The Mark of Death',
  'Defiler Rune': 'Defiler of the Just',
  'Demigod Rune': 'The Dryad and the Demigod',
  'Forge Rune': 'Too Hot to Handle',
  'Hunter Rune': 'Hunt or Be Hunted',
  'Hut Rune': 'Old Baba\'s Hut',
  'Hydra Rune': 'Den of Vipers',
  'Karliath Rune': 'Threats Old and New',
  'Nemesis Rune': 'Project Nemesis',
  'Relentless Rune': 'Relentless',
  'Sands Rune': 'Zawabi\'s Revenge',
  'Strahd Rune': 'The Curse of Strahd',
  'Tempest Rune': 'Legendary Tempest\'s Spine',
  'Time Rune': 'Killing Time',
  'Vault Rune': 'Plane of Night',
  'Vision Rune': 'Legendary Vision of Destruction',
  'Xorian Rune': 'Legendary Hound of Xoriat',
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
