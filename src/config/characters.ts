// Unified character mapping for DDO Audit
// Maps characterId to { name, player, ... }

export interface CharacterInfo {
  id: string
  name: string
  player: string
  // Optionally add: race, classes, etc. if needed
}

// Group characters by player to avoid repeating the player name per character.
// Use `CHARACTERS_BY_PLAYER` if you want to edit characters grouped by owner.

export interface CharacterItem {
  id: string
  name?: string
}

export interface PlayerDefinition {
  /** Optional display name for the player (e.g. localized) */
  display?: string
  /** Character list owned by this player */
  chars: CharacterItem[]
}

export type PlayerCharactersValue = CharacterItem[] | PlayerDefinition

export const CHARACTERS_BY_PLAYER: Record<string, PlayerCharactersValue> = {
  Johnson: {
    chars: [
      { id: '81612777584', name: 'Nonjosh' },
      { id: '81612779875', name: 'Nonjoshii' },
      { id: '81612799899', name: 'Mvppiker' },
      { id: '81612840713', name: 'Nonjoshiv' },
    ],
  },
  Jonah: {
    chars: [
      { id: '81612780583', name: 'Zenrar' },
      { id: '81612795666', name: 'Zenser' },
      { id: '81612777720', name: 'Zertiar' },
      { id: '81613135800', name: 'Zevkar' },
      { id: '111670661572', name: 'Magiz' },
    ],
  },
  Michael: {
    chars: [
      { id: '81612811713', name: 'Garei' },
      { id: '81612782737', name: 'Tareos' },
      { id: '81612777715', name: 'Karc' },
      { id: '81612801618', name: 'Warkon' },
      { id: '111670702832', name: 'Kayos' },
    ],
  },
  Ken: {
    chars: [
      { id: '81612796054', name: 'Feldspars' },
      { id: '81608349902', name: 'Waven' },
      { id: '81612777713', name: 'Nekami' },
      { id: '81612796057', name: 'Nekamisama' },
      { id: '111670420969', name: 'Amiken' },
      { id: '111671347683', name: 'Kenami' },
      { id: '81612780586', name: 'Fatslayer' },
      { id: '111670193026', name: 'Fateslayer' },
      { id: '81612840693', name: 'Nameisfree' },
      { id: '111671727098', name: 'Temor' },
    ],
  },
  Renz: {
    chars: [
      { id: '111678077704', name: 'Hako' },
      { id: '111671237122', name: 'Okah' },
      { id: '111672061714', name: 'Zner' },
      { id: '180388777114', name: 'Znery' },
      { id: '180388801443', name: 'Zneri' },
      { id: '180388818353', name: 'Znerii' },
      { id: '180388822764', name: 'Zneriii' },
      { id: '180388831263', name: 'Zneriv' },
      { id: '111670322311', name: 'Renz' },
    ],
  },
  OldMic: {
    display: '老mic',
    chars: [
      { id: '111670413405', name: 'Keviamin' },
      { id: '111671471817', name: 'Ctenmiir' },
      { id: '111670708744', name: 'Graceella' },
      { id: '111672875879', name: 'Castra' },
    ],
  },
  LY: {
    chars: [
      // { id: 'croxies', name: 'croxies' },
      // { id: 'orbbital', name: 'orbbital' },
      { id: '231929725166', name: 'Orbbizzz-1' },
      // { id: 'oriabito', name: 'oriabito' },
    ],
  },
}

// Auto-generate the flat CHARACTERS map from the grouped definition above.
// Auto-generate the flat CHARACTERS map from the grouped definition above.
export const CHARACTERS: Record<string, CharacterInfo> = (() => {
  const out: Record<string, CharacterInfo> = {}
  for (const [player, value] of Object.entries(CHARACTERS_BY_PLAYER)) {
    // Support both legacy array form and new object form with `chars`.
    const list = Array.isArray(value) ? value : (value as PlayerDefinition).chars ?? []
    for (const item of list ?? []) {
      const id = String(item?.id ?? '').trim()
      if (!id) continue
      out[id] = { id, name: item.name ?? id, player }
    }
  }
  return out
})()

// Derived exports to replace the old `players.ts` small helpers.
export const EXPECTED_PLAYERS = Object.keys(CHARACTERS_BY_PLAYER)

export const PLAYER_DISPLAY_NAMES: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [player, value] of Object.entries(CHARACTERS_BY_PLAYER)) {
    if (!value) continue
    const display = Array.isArray(value) ? undefined : (value as PlayerDefinition).display
    if (typeof display === 'string' && display) out[player] = display
  }
  return out
})()
