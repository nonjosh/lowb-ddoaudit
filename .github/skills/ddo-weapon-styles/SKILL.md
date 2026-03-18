---
name: ddo-weapon-styles
description: "DDO weapon fighting styles (Unarmed, SWF, TWF, THF, S&B, Ranged), weapon type taxonomy, off-hand compatibility, weapon slot validation, and fighting style detection. Use when modifying weapon slot logic, fighting style detection, weapon filtering, off-hand rules (Rune Arm, Orb, Shield), or weapon-related gear planner features."
---

# DDO Weapon Styles and Fighting Mechanics

## When to Use

- Modifying weapon slot logic or fighting style detection
- Adding new weapon types or off-hand equipment
- Changing weapon filtering in gear planner
- Working with weapon validation rules
- Handling Rune Arm compatibility rules

## Fighting Styles

| Style   | Main Hand           | Off Hand                      |
| ------- | ------------------- | ----------------------------- |
| Unarmed | Handwraps           | Nothing                       |
| SWF     | One-handed          | Empty, Orb, or Rune Arm       |
| TWF     | One-handed          | One-handed weapon             |
| THF     | Two-handed          | Nothing                       |
| S&B     | One-handed          | Shield                        |
| Ranged  | Bow/Crossbow/Thrown | Empty, or Rune Arm (not bows) |

### Ranged Special Rules

- **Bows**: Cannot use off-hand (two hands required)
- **Crossbows**: Can use Rune Arm in off-hand
- **Thrown weapons**: Can use Rune Arm in off-hand

## Weapon Type Taxonomy

### Melee

- **Light/One-Handed**: Dagger, Short Sword, Rapier, Scimitar, Longsword, Battleaxe, etc.
- **Two-Handed**: Greatsword, Greataxe, Maul, Falchion, Quarterstaff
- **Special**: Handwraps

### Ranged

- **Bows**: Longbow, Shortbow (no off-hand)
- **Crossbows**: Light/Heavy (can use Rune Arm)
- **Thrown**: Dagger, Axe, Shuriken (can use Rune Arm)

### Off-Hand

- **Shields**: Small/Large/Tower — only with one-handed melee
- **Orbs**: Caster implement — with one-handed melee
- **Rune Arms**: Artificer implement — with one-handed melee, crossbows, thrown

## Type Field Values in Data

```
"Light Weapons", "One-Handed Weapons", "Two-Handed Weapons", "Handwraps",
"Bows", "Crossbows", "Throwing Weapons", "Thrown Weapons",
"Shields", "Orbs", "Rune Arms"
```

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

## Related Files

| File                                      | Purpose                 |
| ----------------------------------------- | ----------------------- |
| `src/domains/gearPlanner/gearSetup.ts`    | Weapon slot definitions |
| `src/domains/gearPlanner/optimization.ts` | Weapon filtering        |
