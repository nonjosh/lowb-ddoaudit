import type {
  EssenceType,
  GemType,
  GreenSteelElement,
  GreenSteelItemType,
  GreenSteelTier,
} from './greenSteelLogic'

export const LGS_WEAPON_TYPES = [
  'Dagger',
  'Heavy Mace',
  'Light Mace',
  'Morningstar',
  'Sceptre',
  'Sickle',
  'Handwraps',
  'Quarterstaff',
  'Battle Axe',
  'Hand Axe',
  'Heavy Pick',
  'Kukri',
  'Light Hammer',
  'Light Pick',
  'Longsword',
  'Rapier',
  'Scimitar',
  'Shortsword',
  'Warhammer',
  'Falchion',
  'Greataxe',
  'Greatclub',
  'Greatsword',
  'Maul',
  'Bastard Sword',
  'Dwarven Waraxe',
  'Kama',
  'Khopesh',
  'Dart',
  'Shuriken',
  'Throwing Axe',
  'Throwing Dagger',
  'Throwing Hammer',
  'Longbow',
  'Shortbow',
  'Great Crossbow',
  'Heavy Crossbow',
  'Light Crossbow',
  'Repeating Heavy Crossbow',
  'Repeating Light Crossbow',
] as const

export const LGS_ACCESSORY_TYPES = [
  'Weave Boots',
  'Weave Gloves',
  'Belt',
  'Weave Cloak',
  'Helm',
  'Necklace',
  'Bracers',
  'Goggles',
] as const

export const LGS_FOCUS_OPTIONS: GreenSteelElement[] = [
  'Air',
  'Earth',
  'Fire',
  'Water',
  'Negative',
  'Positive',
]

const ACCESSORY_CATEGORY_ORDER = [
  'Spell Critical Damage',
  'Reactive Damage',
  'Skills & Spell Points',
  'Skills & Hit Points',
  'Saving Throws',
  'Resistance & Utility',
] as const

const WEAPON_CATEGORY_ORDER = [
  'Spell Power',
  'On-Hit Damage',
  'Mental Stats',
  'Physical Stats',
  'Magical Resistance Rating',
  'Absorption & Utility',
] as const

const LGS_FOCUS_LABEL: Record<GreenSteelElement, string> = {
  Air: 'Air',
  Earth: 'Earth',
  Fire: 'Fire',
  Water: 'Water',
  Negative: 'Negative Energy',
  Positive: 'Positive Energy',
}

const SPELL_CRIT_LABEL: Record<GreenSteelElement, string> = {
  Air: 'Electric Spell Critical Damage',
  Earth: 'Acid Spell Critical Damage',
  Fire: 'Fire Spell Critical Damage',
  Water: 'Cold Spell Critical Damage',
  Negative: 'Negative and Poison Spell Critical Damage',
  Positive: 'Positive Spell Critical Damage',
}

const ACCESSORY_REACTIVE_DAMAGE_LABEL: Record<GreenSteelElement, string> = {
  Air: 'Electric',
  Earth: 'Acid',
  Fire: 'Fire',
  Water: 'Cold',
  Negative: 'Evil',
  Positive: 'Good',
}

const SAVE_LABEL: Record<GreenSteelElement, string> = {
  Air: 'Reflex',
  Earth: 'Fortitude',
  Fire: 'Reflex',
  Water: 'Will',
  Negative: 'Fortitude',
  Positive: 'Will',
}

const ACCESSORY_RESISTANCE_LABEL: Record<'Air' | 'Earth' | 'Fire' | 'Water', string> = {
  Air: 'Electric',
  Earth: 'Acid',
  Fire: 'Fire',
  Water: 'Cold',
}

const MENTAL_SKILL_LABEL: Record<GreenSteelElement, string> = {
  Air: 'Charisma',
  Earth: 'Wisdom',
  Fire: 'Intelligence',
  Water: 'Wisdom',
  Negative: 'Intelligence',
  Positive: 'Charisma',
}

const PHYSICAL_SKILL_LABEL: Record<GreenSteelElement, string> = {
  Air: 'Dexterity',
  Earth: 'Constitution',
  Fire: 'Dexterity',
  Water: 'Strength',
  Negative: 'Strength',
  Positive: 'Constitution',
}

const SPELL_CRIT_SUFFIX: Record<GreenSteelTier, string> = {
  1: '+20% (Enhancement)',
  2: '+10% (Insight)',
  3: '+5% (Quality)',
}

const ACCESSORY_REACTIVE_DAMAGE_DICE: Record<GreenSteelTier, string> = {
  1: '8d6',
  2: '10d6',
  3: '15d6',
}

const ACCESSORY_SKILL_VALUE: Record<GreenSteelTier, string> = {
  1: '+22',
  2: '+11',
  3: '+6',
}

const ACCESSORY_UMD_VALUE: Record<GreenSteelTier, string> = {
  1: '+6',
  2: '+3',
  3: '+1',
}

const ACCESSORY_SKILL_BONUS_TYPE: Record<GreenSteelTier, string> = {
  1: 'Competence',
  2: 'Insight',
  3: 'Quality',
}

const ACCESSORY_HP_VALUE: Record<GreenSteelTier, string> = {
  1: '+28',
  2: '+28',
  3: '+14',
}

const ACCESSORY_HP_BONUS_TYPE: Record<GreenSteelTier, string> = {
  1: 'Profane',
  2: 'Insight',
  3: 'Quality',
}

const ACCESSORY_SP_VALUE: Record<GreenSteelTier, string> = {
  1: '+151',
  2: '+151',
  3: '+75',
}

const ACCESSORY_SP_BONUS_TYPE: Record<GreenSteelTier, string> = {
  1: 'Profane',
  2: 'Insight',
  3: 'Quality',
}

const SAVE_VALUE: Record<GreenSteelTier, string> = {
  1: '+13',
  2: '+7',
  3: '+2',
}

const SAVE_BONUS_TYPE: Record<GreenSteelTier, string> = {
  1: 'Resistance',
  2: 'Insight',
  3: 'Quality',
}

const ACCESSORY_RESISTANCE_VALUE: Record<GreenSteelTier, string> = {
  1: '+50',
  2: '+25',
  3: '+17',
}

const ACCESSORY_RESISTANCE_BONUS_TYPE: Record<GreenSteelTier, string> = {
  1: 'Enhancement',
  2: 'Insight',
  3: 'Competence',
}

const WEAPON_SPELL_POWER_VALUE: Record<GreenSteelTier, string> = {
  1: '+139 (Equipment)',
  2: '+37 (Quality)',
  3: '+37 (Exceptional)',
}

const WEAPON_SPELL_POWER_LABEL: Record<GreenSteelTier, Record<GreenSteelElement, string>> = {
  1: {
    Air: 'Electric Spell Power',
    Earth: 'Acid Spell Power',
    Fire: 'Fire Spell Power',
    Water: 'Cold Spell Power',
    Negative: 'Negative and Poison Spell Power',
    Positive: 'Positive Spell Power',
  },
  2: {
    Air: 'Electric Spell Power',
    Earth: 'Acid Spell Power',
    Fire: 'Fire Spell Power',
    Water: 'Cold Spell Power',
    Negative: 'Negative Spell Power',
    Positive: 'Positive Spell Power',
  },
  3: {
    Air: 'Electric Spell Power',
    Earth: 'Acid Spell Power',
    Fire: 'Fire Spell Power',
    Water: 'Cold Spell Power',
    Negative: 'Negative Spell Power',
    Positive: 'Positive Spell Power',
  },
}

const WEAPON_ATTACK_EFFECT: Record<GreenSteelTier, Record<GreenSteelElement, string>> = {
  1: {
    Air: 'Electric damage on hit - 12d6',
    Earth: 'Acid damage on hit - 12d6',
    Fire: 'Fire damage on hit - 12d6',
    Water: 'Cold damage on hit - 12d6',
    Negative: 'Negative damage on hit - 12d6, makes the weapon Evil-aligned',
    Positive: 'Good damage on hit - 12d6, makes the weapon Good-aligned',
  },
  2: {
    Air: 'Electrical Burst damage on critical hit',
    Earth: 'Acid Burst damage on hit',
    Fire: 'Fire Burst damage on hit',
    Water: 'Cold Burst damage on hit',
    Negative: 'Negative Burst damage on hit, makes the weapon Evil-aligned',
    Positive: 'Good Burst damage on critical hit, makes the weapon Good-aligned',
  },
  3: {
    Air: 'Electric Blast damage on vorpal hit - 11d120',
    Earth: 'Acid Blast damage on vorpal hit - 11d120',
    Fire: 'Fire Blast damage on vorpal hit - 11d120',
    Water: 'Cold Blast damage on vorpal hit - 11d120',
    Negative: 'Negative Blast damage on vorpal hit - 11d120, makes the weapon Evil-aligned',
    Positive: 'Good Blast damage on vorpal hit - 11d120, makes the weapon Good-aligned',
  },
}

const WEAPON_STAT_VALUE: Record<GreenSteelTier, string> = {
  1: '+12',
  2: '+6',
  3: '+2',
}

const WEAPON_STAT_BONUS_TYPE: Record<GreenSteelTier, string> = {
  1: 'Enhancement',
  2: 'Insight',
  3: 'Exceptional',
}

const WEAPON_MRR_EFFECT: Record<GreenSteelTier, string> = {
  1: '+35 MRR (Enhancement)',
  2: '+9 MRR (Quality)',
  3: '+9 MRR (Exceptional)',
}

const WEAPON_ABSORPTION_EFFECT: Record<GreenSteelTier, Record<GreenSteelElement, string>> = {
  1: {
    Air: '+25 Electric Absorption (Enhancement)',
    Earth: '+25 Acid Absorption (Enhancement)',
    Fire: '+25 Fire Absorption (Enhancement)',
    Water: '+25 Cold Absorption (Enhancement)',
    Negative: '+25 Negative Energy Absorption (Enhancement)',
    Positive: '+30 Positive Healing Amplification (Enhancement)',
  },
  2: {
    Air: '30% Electric Absorption',
    Earth: '30% Acid Absorption',
    Fire: '30% Fire Absorption',
    Water: '30% Cold Absorption',
    Negative: '30% Negative Absorption',
    Positive: '+50 Healing Amplification (Equipment)',
  },
  3: {
    Air: '35% Electric Absorption',
    Earth: '35% Acid Absorption',
    Fire: '35% Fire Absorption',
    Water: '35% Cold Absorption',
    Negative: '35% Negative Absorption',
    Positive: '+70 Healing Amplification (Competence)',
  },
}

const ACCESSORY_SPECIAL_OPPOSITION_EFFECT: Record<GreenSteelTier, Record<'Negative' | 'Positive', string>> = {
  1: {
    Negative: '+4 Fortitude Save vs Disease (Insight), Blindness Immunity',
    Positive: '+128 Unconsciousness Range, 16 healing every 10 seconds (Enhancement)',
  },
  2: {
    Negative: '+4 Fortitude Save vs Poison (Insight), Fear Immunity',
    Positive: '+64 Unconsciousness Range, 8 healing every 10 seconds (Insight)',
  },
  3: {
    Negative: '+25 Negative Resistance (Enhancement), Deathblock',
    Positive: '+32 Unconsciousness Range, 4 healing every 10 seconds (Quality)',
  },
}

const LEGACY_LGS_SUBTYPE_MAP: Record<string, string> = {
  Boots: 'Weave Boots',
  Gloves: 'Weave Gloves',
  Cloak: 'Weave Cloak',
  Hat: 'Helm',
  'Long Sword': 'Longsword',
  'Great Sword': 'Greatsword',
  'Great Axe': 'Greataxe',
  'Great Club': 'Greatclub',
  'War Hammer': 'Warhammer',
  Handwrap: 'Handwraps',
}

interface LgsOptionFamily {
  id: string
  essenceType: EssenceType
  gemType: GemType
  categoryByItemType: Record<GreenSteelItemType, string>
  buildEffectName: (
    tier: GreenSteelTier,
    itemType: GreenSteelItemType,
    focus: GreenSteelElement,
  ) => string
}

export interface LgsCraftingOption {
  id: string
  tier: GreenSteelTier
  itemType: GreenSteelItemType
  category: string
  focus: GreenSteelElement
  essenceType: EssenceType
  gemType: GemType
  effectName: string
  description: string
  requiresSecondaryFocus: boolean
}

export interface LgsTierSelection {
  tier: GreenSteelTier
  optionId: string | null
  secondaryFocus: GreenSteelElement | null
}

const LGS_OPTION_FAMILIES: readonly LgsOptionFamily[] = [
  {
    id: 'ethereal-dominion',
    essenceType: 'Ethereal',
    gemType: 'Dominion',
    categoryByItemType: {
      Accessory: 'Spell Critical Damage',
      Weapon: 'Spell Power',
    },
    buildEffectName: (tier, itemType, focus) => {
      if (itemType === 'Accessory') {
        return `${SPELL_CRIT_LABEL[focus]} ${SPELL_CRIT_SUFFIX[tier]}`
      }
      return `${WEAPON_SPELL_POWER_LABEL[tier][focus]} ${WEAPON_SPELL_POWER_VALUE[tier]}`
    },
  },
  {
    id: 'material-dominion',
    essenceType: 'Material',
    gemType: 'Dominion',
    categoryByItemType: {
      Accessory: 'Reactive Damage',
      Weapon: 'On-Hit Damage',
    },
    buildEffectName: (tier, itemType, focus) => {
      if (itemType === 'Accessory') {
        return `${ACCESSORY_REACTIVE_DAMAGE_LABEL[focus]} damage on being hit - ${ACCESSORY_REACTIVE_DAMAGE_DICE[tier]}`
      }
      return WEAPON_ATTACK_EFFECT[tier][focus]
    },
  },
  {
    id: 'ethereal-escalation',
    essenceType: 'Ethereal',
    gemType: 'Escalation',
    categoryByItemType: {
      Accessory: 'Skills & Spell Points',
      Weapon: 'Mental Stats',
    },
    buildEffectName: (tier, itemType, focus) => {
      if (itemType === 'Weapon') {
        return `${WEAPON_STAT_VALUE[tier]} ${MENTAL_SKILL_LABEL[focus]} (${WEAPON_STAT_BONUS_TYPE[tier]})`
      }
      if (focus === 'Air' || focus === 'Positive') {
        return `${ACCESSORY_SKILL_VALUE[tier]} Charisma Skills / ${ACCESSORY_UMD_VALUE[tier]} UMD (${ACCESSORY_SKILL_BONUS_TYPE[tier]}), ${ACCESSORY_SP_VALUE[tier]} Spell Points (${ACCESSORY_SP_BONUS_TYPE[tier]})`
      }
      return `${ACCESSORY_SKILL_VALUE[tier]} ${MENTAL_SKILL_LABEL[focus]} Skills (${ACCESSORY_SKILL_BONUS_TYPE[tier]}), ${ACCESSORY_SP_VALUE[tier]} Spell Points (${ACCESSORY_SP_BONUS_TYPE[tier]})`
    },
  },
  {
    id: 'material-escalation',
    essenceType: 'Material',
    gemType: 'Escalation',
    categoryByItemType: {
      Accessory: 'Skills & Hit Points',
      Weapon: 'Physical Stats',
    },
    buildEffectName: (tier, itemType, focus) => {
      if (itemType === 'Weapon') {
        return `${WEAPON_STAT_VALUE[tier]} ${PHYSICAL_SKILL_LABEL[focus]} (${WEAPON_STAT_BONUS_TYPE[tier]})`
      }
      return `${ACCESSORY_SKILL_VALUE[tier]} ${PHYSICAL_SKILL_LABEL[focus]} Skills (${ACCESSORY_SKILL_BONUS_TYPE[tier]}), ${ACCESSORY_HP_VALUE[tier]} Hit Points (${ACCESSORY_HP_BONUS_TYPE[tier]})`
    },
  },
  {
    id: 'ethereal-opposition',
    essenceType: 'Ethereal',
    gemType: 'Opposition',
    categoryByItemType: {
      Accessory: 'Saving Throws',
      Weapon: 'Magical Resistance Rating',
    },
    buildEffectName: (tier, itemType, focus) => {
      if (itemType === 'Weapon') {
        return WEAPON_MRR_EFFECT[tier]
      }
      return `${SAVE_VALUE[tier]} ${SAVE_LABEL[focus]} Save (${SAVE_BONUS_TYPE[tier]})`
    },
  },
  {
    id: 'material-opposition',
    essenceType: 'Material',
    gemType: 'Opposition',
    categoryByItemType: {
      Accessory: 'Resistance & Utility',
      Weapon: 'Absorption & Utility',
    },
    buildEffectName: (tier, itemType, focus) => {
      if (itemType === 'Weapon') {
        return WEAPON_ABSORPTION_EFFECT[tier][focus]
      }
      if (focus === 'Negative' || focus === 'Positive') {
        return ACCESSORY_SPECIAL_OPPOSITION_EFFECT[tier][focus]
      }
      return `${ACCESSORY_RESISTANCE_VALUE[tier]} ${ACCESSORY_RESISTANCE_LABEL[focus]} Resistance (${ACCESSORY_RESISTANCE_BONUS_TYPE[tier]})`
    },
  },
] as const

function buildOptionDescription(
  focus: GreenSteelElement,
  essenceType: EssenceType,
  gemType: GemType,
  requiresSecondaryFocus: boolean,
): string {
  const base = `${LGS_FOCUS_LABEL[focus]} focus • ${essenceType} essence • ${gemType} gem`
  if (!requiresSecondaryFocus) {
    return base
  }
  return `${base} • add a second Tier 3 focus for the double-shard recipe`
}

function buildLgsOptions(): LgsCraftingOption[] {
  const options: LgsCraftingOption[] = []

  for (const itemType of ['Accessory', 'Weapon'] as const) {
    for (const tier of [1, 2, 3] as const) {
      for (const family of LGS_OPTION_FAMILIES) {
        for (const focus of LGS_FOCUS_OPTIONS) {
          const requiresSecondaryFocus = itemType === 'Weapon' && tier === 3
          options.push({
            id: `${itemType.toLowerCase()}-t${tier}-${family.id}-${focus.toLowerCase()}`,
            tier,
            itemType,
            category: family.categoryByItemType[itemType],
            focus,
            essenceType: family.essenceType,
            gemType: family.gemType,
            effectName: family.buildEffectName(tier, itemType, focus),
            description: buildOptionDescription(
              focus,
              family.essenceType,
              family.gemType,
              requiresSecondaryFocus,
            ),
            requiresSecondaryFocus,
          })
        }
      }
    }
  }

  return options
}

const LGS_OPTIONS = buildLgsOptions()
const LGS_OPTION_BY_ID = new Map(LGS_OPTIONS.map((option) => [option.id, option]))
const LGS_OPTIONS_BY_ITEM_AND_TIER: Record<GreenSteelItemType, Record<GreenSteelTier, LgsCraftingOption[]>> = {
  Accessory: { 1: [], 2: [], 3: [] },
  Weapon: { 1: [], 2: [], 3: [] },
}

for (const option of LGS_OPTIONS) {
  LGS_OPTIONS_BY_ITEM_AND_TIER[option.itemType][option.tier].push(option)
}

export function getLgsSubTypeOptions(itemType: GreenSteelItemType): readonly string[] {
  return itemType === 'Weapon' ? LGS_WEAPON_TYPES : LGS_ACCESSORY_TYPES
}

export function normalizeLgsItemSubType(itemType: GreenSteelItemType, itemSubType: string): string {
  const normalized = LEGACY_LGS_SUBTYPE_MAP[itemSubType] ?? itemSubType
  const options = getLgsSubTypeOptions(itemType)
  return options.some((option) => option === normalized) ? normalized : options[0]
}

export function getLgsOptionCategories(itemType: GreenSteelItemType): readonly string[] {
  return itemType === 'Weapon' ? WEAPON_CATEGORY_ORDER : ACCESSORY_CATEGORY_ORDER
}

export function getLgsOptions(
  itemType: GreenSteelItemType,
  tier: GreenSteelTier,
): readonly LgsCraftingOption[] {
  return LGS_OPTIONS_BY_ITEM_AND_TIER[itemType][tier]
}

export function getLgsOptionById(optionId: string): LgsCraftingOption | undefined {
  return LGS_OPTION_BY_ID.get(optionId)
}
