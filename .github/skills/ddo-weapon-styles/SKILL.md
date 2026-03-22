---
name: ddo-weapon-styles
description: "DDO weapon fighting styles (Unarmed, SWF, TWF, THF, S&B, Ranged), weapon type taxonomy, off-hand compatibility, weapon slot validation, and fighting style detection. Use when modifying weapon slot logic, fighting style detection, weapon filtering, off-hand rules (Rune Arm, Orb, Shield), or weapon-related gear planner features."
---

# DDO Weapon Styles and Fighting Mechanics

Source: <https://ddowiki.com/page/Fighting_styles>

## When to Use

- Modifying weapon slot logic or fighting style detection
- Adding new weapon types or off-hand equipment
- Changing weapon filtering in gear planner
- Working with weapon validation rules
- Handling Rune Arm compatibility rules

## Fighting Styles

| Style   | Main Hand  | Off Hand                                              |
| ------- | ---------- | ----------------------------------------------------- |
| Unarmed | Handwraps  | Nothing (occupies both weapon slots)                  |
| SWF     | One-handed | Empty, Orb, or Rune Arm                               |
| TWF     | One-handed | One-handed weapon                                     |
| THF     | Two-handed | Nothing (requires both hands)                         |
| S&B     | One-handed | Shield (Buckler, Small, Large, or Tower)              |
| Bow     | Bow        | Nothing (requires both hands)                         |
| Xbow    | Crossbow   | Rune Arm only (requires both hands, exception for RA) |
| Thrown  | Thrown     | One-handed weapon, Shield, Orb, Rune Arm, or nothing  |

### Ranged Weapon Off-Hand Rules (per DDO Wiki)

- **Bows**: Need two hands to use. Off-hand slot is completely blocked.
- **Crossbows**: Need both hands. But you can place a Rune Arm in off-hand if proficient. Inquisitives visually dual-wield crossbows but mechanically use a single non-repeating crossbow + Rune Arm.
- **Thrown weapons**: Main-hand only (cannot dual wield throwing weapons). Off-hand can be: rune arm, orb, shield, one-handed melee weapon, or nothing.

### Swashbuckling (SWF Variant)

Swashbuckling is a variant of SWF: wield a finesseable or thrown weapon in main hand, with a Buckler or nothing in off-hand. Enhancements expand this to also allow an orb, buckler, or rune arm. For gear planner purposes, this doesn't require special handling — the thrown weapon off-hand rules already cover these options.

### Handwraps / Unarmed

Handwraps are a single item that occupies both weapon slots (like a two-handed weapon) but benefit from Two Weapon Fighting feats. Off-hand is completely blocked.

## Weapon Type Taxonomy

### Melee

- **Light/One-Handed**: Dagger, Short Sword, Rapier, Scimitar, Longsword, Battleaxe, etc.
- **Two-Handed**: Greatsword, Greataxe, Maul, Falchion, Quarterstaff
- **Special**: Handwraps (occupy both slots, benefit from TWF)

### Ranged

- **Bows**: Longbow, Shortbow (no off-hand)
- **Crossbows**: Light/Heavy/Repeating (Rune Arm only in off-hand)
- **Thrown**: Dagger, Axe, Shuriken (one-handed melee, shield, orb, rune arm, or nothing in off-hand)

### Off-Hand

- **Shields**: Buckler/Small/Large/Tower — with one-handed melee or thrown weapons
- **Orbs**: Caster implement — with one-handed melee or thrown weapons
- **Rune Arms**: Artificer implement — with one-handed melee, crossbows, or thrown weapons

## Type Field Values in Data

Weapon types use specific subtypes, not generic categories:

```
// One-handed melee
"Bastard Swords", "Battle Axes", "Clubs", "Daggers", "Dwarven War Axes",
"Hand Axes", "Heavy Maces", "Heavy Picks", "Kamas", "Khopeshes", "Kukris",
"Light Hammers", "Light Maces", "Light Picks", "Long Swords", "Morningstars",
"Rapiers", "Scimitars", "Short Swords", "Sickles", "War Hammers"

// Two-handed melee
"Falchions", "Great Axes", "Great Clubs", "Great Swords", "Mauls", "Quarterstaffs"

// Special
"Handwraps"

// Bows (type includes "bow" but not "crossbow")
"Long Bows", "Short Bows"

// Crossbows (type includes "crossbow")
"Great Crossbows", "Heavy Crossbows", "Light Crossbows",
"Repeating Heavy Crossbows", "Repeating Light Crossbows"

// Thrown weapons
"Darts", "Shurikens", "Throwing Axes", "Throwing Daggers", "Throwing Hammers"

// Off-hand
"Shields", "Orbs", "Rune Arms"
```

**Important**: Type checks use `includes()` or Set lookups, NOT exact equality, because types are specific (e.g., "Long Bows" not "Bows").

## Fighting Style Detection

```typescript
function detectFightingStyle(mainHand, offHand): FightingStyle {
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

## Gear Setup Weapon Slots

```typescript
interface GearSetup {
  mainHand?: Item; // Weapon slot
  offHand?: Item; // Offhand or second weapon
  // ... other slots
}
```

With weapons: 14 slots total (12 gear + Main Hand + Off Hand).

## Off-Hand Blocking Logic

The gear planner enforces weapon restrictions on the off-hand slot:

- **Two-handed weapons, handwraps, bows** → Off-hand completely blocked (no items allowed)
- **Crossbows** → Off-hand restricted to Rune Arms only
- **Thrown weapons** → Main-hand only; off-hand allows one-handed melee weapons, shields, orbs, or Rune Arms (cannot dual wield thrown)
- **One-handed weapons** → Any valid off-hand (shield, orb, rune arm, one-handed weapon)

Key helper functions in `fightingStyles.ts`:

```typescript
isOffHandBlocked(mainHand); // true for two-handed, handwraps, bows
isOffHandRuneArmOnly(mainHand); // true for crossbows only
getOffHandWarning(mainHand, offHand); // returns warning text or null
isValidWeaponCombination(mainHand, offHand); // full validation
isBow(item); // "Bows" type only (not crossbows)
isCrossbow(item); // "Crossbows" type
isThrownWeapon(item); // "Throwing Weapons" / "Thrown Weapons"
isSingleHandedWeapon(item); // Light/One-Handed (not handwrap/two-handed/ranged)
```

The evaluation engine (`evaluateGearSetup`) uses `isValidWeaponCombination()` to automatically ignore off-hand affixes/sets when the weapon combination is invalid. The UI shows a warning text on the off-hand gear slot card when an invalid or restricted combination is detected. The greedy optimizer skips invalid weapon/offhand combinations.

## Related Files

| File                                         | Purpose                                     |
| -------------------------------------------- | ------------------------------------------- |
| `src/domains/gearPlanner/gearSetup.ts`       | Weapon slot definitions                     |
| `src/domains/gearPlanner/fightingStyles.ts`  | Fighting style detection, off-hand blocking |
| `src/domains/gearPlanner/optimization.ts`    | Evaluation with off-hand blocking           |
| `src/domains/gearPlanner/suggestions.ts`     | Optimizer with weapon restrictions          |
| `src/components/gearPlanner/GearDisplay.tsx` | Off-hand warning UI                         |
