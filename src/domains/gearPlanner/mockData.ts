import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'

// Sample items for testing
export const mockItems: Item[] = [
  {
    name: 'Belt of Constitution',
    ml: 10,
    slot: 'Belt',
    affixes: [
      { name: 'Constitution', type: 'Enhancement', value: 7 },
      { name: 'Constitution', type: 'Insight', value: 3 },
      { name: 'Physical Sheltering', type: 'Quality', value: 10 }
    ]
  },
  {
    name: 'Ring of Strength',
    ml: 12,
    slot: 'Ring',
    affixes: [
      { name: 'Strength', type: 'Enhancement', value: 8 },
      { name: 'Melee Power', type: 'Competence', value: 10 }
    ]
  },
  {
    name: 'Ring of Dexterity',
    ml: 12,
    slot: 'Ring',
    affixes: [
      { name: 'Dexterity', type: 'Enhancement', value: 8 },
      { name: 'Doublestrike', type: 'Quality', value: 6 }
    ]
  },
  {
    name: 'Gloves of the Claw',
    ml: 15,
    slot: 'Gloves',
    affixes: [
      { name: 'Strength', type: 'Enhancement', value: 10 },
      { name: 'Doublestrike', type: 'Enhancement', value: 8 },
      { name: 'Melee Power', type: 'Enhancement', value: 15 }
    ]
  },
  {
    name: 'Boots of Speed',
    ml: 10,
    slot: 'Boots',
    affixes: [
      { name: 'Dexterity', type: 'Enhancement', value: 7 },
      { name: 'Doublestrike', type: 'Quality', value: 5 }
    ]
  },
  {
    name: 'Bracers of Wind',
    ml: 12,
    slot: 'Bracers',
    affixes: [
      { name: 'Dexterity', type: 'Insight', value: 4 },
      { name: 'Ranged Power', type: 'Enhancement', value: 12 }
    ]
  },
  {
    name: 'Helm of Tactics',
    ml: 15,
    slot: 'Helm',
    affixes: [
      { name: 'Constitution', type: 'Enhancement', value: 8 },
      { name: 'Intelligence', type: 'Enhancement', value: 8 },
      { name: 'Tactical Training', type: 'Enhancement', value: 5 }
    ]
  },
  {
    name: 'Cloak of Shadows',
    ml: 10,
    slot: 'Cloak',
    affixes: [
      { name: 'Dexterity', type: 'Enhancement', value: 7 },
      { name: 'Hide', type: 'Competence', value: 15 },
      { name: 'Move Silently', type: 'Competence', value: 15 }
    ]
  },
  {
    name: 'Goggles of Insight',
    ml: 12,
    slot: 'Goggles',
    affixes: [
      { name: 'Intelligence', type: 'Insight', value: 5 },
      { name: 'Wisdom', type: 'Insight', value: 5 },
      { name: 'Spell Penetration', type: 'Equipment', value: 3 }
    ]
  },
  {
    name: 'Necklace of Power',
    ml: 15,
    slot: 'Necklace',
    affixes: [
      { name: 'Strength', type: 'Enhancement', value: 10 },
      { name: 'Constitution', type: 'Enhancement', value: 10 },
      { name: 'Melee Power', type: 'Quality', value: 12 }
    ]
  },
  {
    name: 'Plate Armor of the Titan',
    ml: 20,
    slot: 'Armor',
    affixes: [
      { name: 'Strength', type: 'Enhancement', value: 12 },
      { name: 'Constitution', type: 'Enhancement', value: 12 },
      { name: 'Fortification', type: 'Enhancement', value: 150 },
      { name: 'Physical Sheltering', type: 'Enhancement', value: 25 }
    ],
    crafting: ['Yellow Augment Slot', 'Blue Augment Slot']
  },
  {
    name: 'Trinket of Perfection',
    ml: 18,
    slot: 'Trinket',
    affixes: [
      { name: 'Doublestrike', type: 'Artifact', value: 10 },
      { name: 'Melee Power', type: 'Artifact', value: 20 },
      { name: 'Fortification', type: 'Artifact', value: 50 }
    ],
    crafting: ['Green Augment Slot', 'Red Augment Slot', 'Colorless Augment Slot']
  },
  {
    name: 'Simple Belt',
    ml: 5,
    slot: 'Belt',
    affixes: [
      { name: 'Constitution', type: 'Enhancement', value: 5 }
    ]
  },
  {
    name: 'Simple Ring',
    ml: 5,
    slot: 'Ring',
    affixes: [
      { name: 'Strength', type: 'Enhancement', value: 5 }
    ]
  }
]

export const mockSetsData: SetsData = {
  'Legendary Set of Power': [
    {
      threshold: 2,
      affixes: [
        { name: 'Strength', type: 'Profane', value: 5 },
        { name: 'Melee Power', type: 'Profane', value: 10 }
      ]
    },
    {
      threshold: 3,
      affixes: [
        { name: 'Strength', type: 'Profane', value: 10 },
        { name: 'Melee Power', type: 'Profane', value: 20 }
      ]
    }
  ]
}

/**
 * Mock crafting data matching the crafting slots on mockItems.
 * Used by the Gear Planner Demo page to demonstrate augment selection.
 */
export const mockCraftingData: CraftingData = {
  'Yellow Augment Slot': {
    '*': [
      {
        name: 'Topaz of Strength +14',
        affixes: [{ name: 'Strength', type: 'Enhancement', value: 14 }],
        ml: 15
      },
      {
        name: 'Topaz of Strength +10',
        affixes: [{ name: 'Strength', type: 'Enhancement', value: 10 }],
        ml: 10
      },
      {
        name: 'Topaz of Constitution +14',
        affixes: [{ name: 'Constitution', type: 'Enhancement', value: 14 }],
        ml: 15
      }
    ]
  },
  'Blue Augment Slot': {
    '*': [
      {
        name: 'Sapphire of Constitution +14',
        affixes: [{ name: 'Constitution', type: 'Enhancement', value: 14 }],
        ml: 15
      },
      {
        name: 'Sapphire of Strength +10',
        affixes: [{ name: 'Strength', type: 'Enhancement', value: 10 }],
        ml: 10
      }
    ]
  },
  'Green Augment Slot': {
    '*': [
      {
        name: 'Emerald of Doublestrike +8',
        affixes: [{ name: 'Doublestrike', type: 'Enhancement', value: 8 }],
        ml: 15
      },
      {
        name: 'Emerald of Doublestrike +5',
        affixes: [{ name: 'Doublestrike', type: 'Enhancement', value: 5 }],
        ml: 10
      }
    ]
  },
  'Red Augment Slot': {
    '*': [
      {
        name: 'Ruby of Melee Power +12',
        affixes: [{ name: 'Melee Power', type: 'Enhancement', value: 12 }],
        ml: 15
      }
    ]
  },
  'Colorless Augment Slot': {
    '*': [
      {
        name: 'Diamond of Constitution +5',
        affixes: [{ name: 'Constitution', type: 'Insight', value: 5 }],
        ml: 12
      }
    ]
  }
}
