export type PuzzleSolverId =
  | 'monastery-of-the-scorpion'
  | 'reavers-fate'
  | 'the-key-to-the-mythal'
  | 'the-shadow-crypt'
  | 'the-shroud'
  | 'total-chaos'

export interface PuzzleNavItem {
  id: PuzzleSolverId
  label: string
  path: string
  subtitle: string
  description: string
  solver: 'monastery' | 'mastermind' | 'shadow-crypt' | 'shroud' | 'total-chaos'
}

export const PUZZLE_NAV_ITEMS: readonly PuzzleNavItem[] = [
  {
    id: 'monastery-of-the-scorpion',
    label: 'Monastery of the Scorpion',
    path: '/puzzles/monastery-of-the-scorpion',
    subtitle: "The Reaver's Reach",
    description: 'Configure the board in Edit mode, switch to Play, then reveal the optimal presses.',
    solver: 'monastery',
  },
  {
    id: 'reavers-fate',
    label: 'Reavers Fate',
    path: '/puzzles/reavers-fate',
    subtitle: 'Mastermind puzzle',
    description: 'Enter black and white peg feedback to narrow the correct four-color sequence.',
    solver: 'mastermind',
  },
  {
    id: 'the-key-to-the-mythal',
    label: 'The Key to the Mythal',
    path: '/puzzles/the-key-to-the-mythal',
    subtitle: 'Mastermind puzzle',
    description: 'Use the same Mastermind flow to identify the right four-color code.',
    solver: 'mastermind',
  },
  {
    id: 'the-shadow-crypt',
    label: 'The Shadow Crypt',
    path: '/puzzles/the-shadow-crypt',
    subtitle: 'The Necropolis, Part II',
    description: 'Follow the color-specific route checklist and mark steps as your group progresses.',
    solver: 'shadow-crypt',
  },
  {
    id: 'the-shroud',
    label: 'The Shroud',
    path: '/puzzles/the-shroud',
    subtitle: 'The Vale of Twilight',
    description: 'Solve square and circular Lights Out boards used by The Shroud.',
    solver: 'shroud',
  },
  {
    id: 'total-chaos',
    label: 'Total Chaos',
    path: '/puzzles/total-chaos',
    subtitle: 'Keep on the Borderlands',
    description: 'Solve the W-shaped Lights Out board by matching the live state and revealing the press pattern.',
    solver: 'total-chaos',
  },
] as const

export const DEFAULT_PUZZLE_PATH = PUZZLE_NAV_ITEMS[0].path

export function getPuzzleBySlug(slug: string): PuzzleNavItem | undefined {
  return PUZZLE_NAV_ITEMS.find((item) => item.id === slug)
}