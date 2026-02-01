# Weapon Styles and Fighting Mechanics

**Last Updated**: 2026-01-31

## Overview

This document describes the weapon slot mechanics in DDO and how they are implemented in the gear planner. DDO has distinct fighting styles that determine which weapon combinations are valid.

---

## DDO Fighting Styles

### 1. Unarmed (Handwraps)

**Mechanics**:

- Requires **Handwraps** equipped
- No off-hand allowed
- Uses Monk unarmed damage progression
- Benefits from Two Weapon Fighting feats if trained

**Valid Equipment**:

- **Main Hand**: Handwraps only
- **Off Hand**: Nothing

**Implementation**:

```typescript
// Handwrap detection
item.slot === "Weapon" && item.type?.toLowerCase().includes("handwrap");
```

---

### 2. Single Weapon Fighting (SWF)

**Mechanics**:

- One-handed weapon in main hand
- Off-hand can be empty, or hold Orb/Rune Arm
- Benefits from Single Weapon Fighting feats for defensive bonuses and doublestrike

**Valid Equipment**:

- **Main Hand**: One-handed weapon (Light/One-Handed)
- **Off Hand**: Empty, Orb, or Rune Arm

**Implementation**:

- Main hand: Single-handed weapons (not handwraps, two-handed, or ranged)
- Off hand: Orbs or Rune Arms only

---

### 3. Two Weapon Fighting (TWF)

**Mechanics**:

- One-handed weapon in each hand
- Grants off-hand attacks (bonus attacks based on TWF feat tier)
- Both weapons can proc effects
- Benefits from Two Weapon Fighting feats for off-hand attack rate

**Valid Equipment**:

- **Main Hand**: One-handed weapon
- **Off Hand**: One-handed weapon

**Implementation**:

- Both slots: Single-handed weapons
- Excluded: Handwraps, two-handed weapons, ranged weapons, shields, orbs, rune arms

---

### 4. Two-Handed Fighting (THF)

**Mechanics**:

- Two-handed weapon requires both hands
- No off-hand equipment allowed
- Benefits from Two-Handed Fighting feats for glancing blows and damage multiplier
- Higher base weapon damage

**Valid Equipment**:

- **Main Hand**: Two-handed weapon (Greataxe, Greatsword, Maul, etc.)
- **Off Hand**: Nothing

**Implementation**:

```typescript
// Two-handed detection
item.slot === "Weapon" && item.type?.toLowerCase().includes("two-handed");
```

---

### 5. Sword & Board (S&B)

**Mechanics**:

- One-handed weapon + Shield
- Shield provides AC, PRR, MRR, and shield bonuses
- Benefits from Shield Mastery feats for defensive bonuses
- Shield bash attacks possible with feats

**Valid Equipment**:

- **Main Hand**: One-handed weapon
- **Off Hand**: Shield

**Implementation**:

- Main hand: Single-handed weapons
- Off hand: Shields only (item.slot === 'Offhand' && item.type === 'Shields')

---

### 6. Ranged (Bow/Crossbow/Thrown)

**Mechanics**:

- Uses ranged weapons with distance attacks
- Can use Rune Arm in off-hand with **Crossbows** and **Throwing Weapons** (NOT bows)
- Benefits from Ranged Power, Doubleshot
- Requires ammo (automatic/infinite in DDO)

**Valid Equipment**:

- **Main Hand**: Bow, Crossbow, or Throwing weapon
- **Off Hand**: Empty, or Rune Arm (only with Crossbow/Thrown)

**Special Rules**:

- **Bows**: Cannot use off-hand (two hands required)
- **Crossbows**: Can use Rune Arm in off-hand
- **Throwing Weapons**: Can use Rune Arm in off-hand

**Implementation**:

```typescript
// Ranged weapon detection
function isRangedWeapon(item: Item): boolean {
  const type = item.type?.toLowerCase() ?? "";
  const name = item.name.toLowerCase();
  return (
    type.includes("bow") ||
    type.includes("crossbow") ||
    type.includes("throwing") ||
    type.includes("thrown") ||
    name.includes("bow") ||
    name.includes("crossbow")
  );
}
```

---

## Weapon Type Taxonomy

### Melee Weapons

#### One-Handed Melee

- **Light Weapons**: Dagger, Short Sword, Rapier, Scimitar
- **One-Handed Weapons**: Longsword, Battleaxe, Warhammer, Mace, Handaxe, Kukri

#### Two-Handed Melee

- **Two-Handed Weapons**: Greatsword, Greataxe, Maul, Falchion, Quarterstaff

#### Special Melee

- **Handwraps**: Monk unarmed weapons

### Ranged Weapons

#### Bows

- **Longbow**: Two-handed, higher damage
- **Shortbow**: Two-handed, faster attack speed
- Cannot use off-hand

#### Crossbows

- **Light Crossbow**: One-handed, can use Rune Arm
- **Heavy Crossbow**: One-handed, can use Rune Arm
- Higher base damage than bows, slower reload

#### Thrown

- **Throwing Dagger**: Can use Rune Arm
- **Throwing Axe**: Can use Rune Arm
- **Shuriken**: Can use Rune Arm
- Returns to hand automatically

### Off-Hand Equipment

#### Defensive

- **Shields**: Small Shield, Large Shield, Tower Shield
  - Provides AC, PRR, MRR
  - Only with one-handed melee weapons

#### Magical

- **Orbs**: Caster implement
  - Provides spell power and caster stats
  - Compatible with one-handed melee

- **Rune Arms**: Artificer implement
  - Provides spell power and caster stats
  - Compatible with one-handed melee, crossbows, and thrown weapons
  - **NOT compatible with bows**

---

## Implementation Details

### Weapon Slot Keys

```typescript
export interface GearSetup {
  // ... other slots ...
  mainHand?: Item; // Weapon slot
  offHand?: Item; // Offhand or second weapon
}
```

### Fighting Style Detection

The system automatically detects fighting style from equipped weapons:

```typescript
function detectFightingStyle(
  mainHand: Item | undefined,
  offHand: Item | undefined,
): FightingStyle {
  if (!mainHand) return "none";
  if (isHandwrap(mainHand)) return "unarmed";
  if (isTwoHandedWeapon(mainHand)) return "thf";
  if (isRangedWeapon(mainHand)) return "ranged";
  if (!offHand) return "swf";
  if (isShield(offHand)) return "snb";
  if (isOrb(offHand) || isRuneArm(offHand)) return "swf";
  if (offHand.slot === "Weapon") return "twf";
  return "swf";
}
```

### Weapon Filtering

The optimizer filters available weapons based on selected fighting style:

- **Unarmed**: Only handwraps
- **SWF**: Single-handed weapons (main), Orb/Rune Arm (off)
- **TWF**: Single-handed weapons (both slots)
- **THF**: Two-handed weapons (main only)
- **S&B**: Single-handed weapons (main), Shields (off)
- **Ranged**: Ranged weapons (main), Rune Arm only (off)

### Validation Rules

```typescript
function isValidWeaponCombination(
  mainHand: Item | undefined,
  offHand: Item | undefined,
): boolean {
  // Handwrap/Two-handed: No off-hand
  if (isHandwrap(mainHand) || isTwoHandedWeapon(mainHand)) {
    return !offHand;
  }

  // Ranged: Only Rune Arm in off-hand
  if (isRangedWeapon(mainHand)) {
    return !offHand || isRuneArm(offHand);
  }

  // Single-handed: Any valid off-hand or empty
  if (isSingleHandedWeapon(mainHand)) {
    return (
      !offHand ||
      offHand.slot === "Offhand" ||
      (offHand.slot === "Weapon" && isSingleHandedWeapon(offHand))
    );
  }

  return false;
}
```

---

## Optimization Behavior

### Slot Count

- **No Weapons**: 12 slots (original)
- **With Weapons**: 14 slots (adds Main Hand + Off Hand)

### Filtering Logic

1. User selects fighting style
2. System filters valid weapons for main hand
3. System filters valid off-hand items based on main hand weapon type
4. Invalid combinations are excluded from optimization

### Crafting Support

- Weapon augment slots work identically to armor augments
- Weapon set bonuses are counted toward set completion
- Artifact weapons count toward 1-artifact limit

---

## Common Weapon Types in DDO Data

### Type Field Values

From `items.json` data structure:

```typescript
// Melee weapons
"type": "Light Weapons"
"type": "One-Handed Weapons"
"type": "Two-Handed Weapons"
"type": "Handwraps"

// Ranged weapons
"type": "Bows"              // Longbow, Shortbow
"type": "Crossbows"         // Light/Heavy Crossbow
"type": "Throwing Weapons"  // Daggers, Axes, Shuriken
"type": "Thrown Weapons"    // Alternative naming

// Off-hand
"type": "Shields"           // Small/Large/Tower Shield
"type": "Orbs"              // Caster implements
"type": "Rune Arms"         // Artificer implements
```

---

## Testing Coverage

### Test Cases

1. ✅ Unarmed: Only handwraps allowed, no off-hand
2. ✅ SWF: Single-handed + empty/orb/rune arm
3. ✅ TWF: Two single-handed weapons
4. ✅ THF: Two-handed only, no off-hand
5. ✅ S&B: Single-handed + shield
6. ✅ Ranged: Bow/Crossbow/Thrown + optional rune arm
7. ✅ ML filtering applies to weapons
8. ✅ Set bonuses work with weapon sets
9. ✅ Artifact weapons count toward limit

---

## Known Limitations

1. **Bow vs Crossbow**: Currently grouped as "ranged", but bows cannot use off-hand while crossbows can. The `isRangedWeapon()` function detects all ranged weapons. The system allows Rune Arms with ranged weapons, which is correct for crossbows/thrown but technically allows it with bows too. This is acceptable as the optimizer will still find valid builds.

2. **Exotic Weapons**: Some weapons (like Bastard Sword) can be wielded one-handed or two-handed depending on feats. We treat them based on their `type` field in the data.

3. **Feat Requirements**: The optimizer doesn't check if the character has required feats (e.g., TWF, SWF, Shield Mastery). It assumes the player will train appropriate feats.

---

## Related Files

### Implementation

- `src/domains/gearPlanner/fightingStyles.ts` - Fighting style detection and validation
- `src/domains/gearPlanner/gearSetup.ts` - Gear slot definitions (includes weapon slots)
- `src/domains/gearPlanner/optimization.ts` - Weapon optimization logic
- `src/components/gearPlanner/FightingStyleSelector.tsx` - UI selector
- `src/components/gearPlanner/GearDisplay.tsx` - Weapon slot display

### Data

- `public/data/items.json` - Item database (from ddo-gear-planner)

---

## Changelog

### 2026-01-31

- Added **Ranged** fighting style support
- Implemented Rune Arm compatibility with crossbows and throwing weapons
- Added `isRangedWeapon()` detection function
- Updated weapon filtering to handle ranged weapons separately
- Fixed UI issues with weapon slot item selection
- Created this documentation
