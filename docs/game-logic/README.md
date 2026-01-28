# DDO Game Logic Documentation

This directory contains comprehensive documentation of Dungeons & Dragons Online (DDO) game mechanics as implemented in this codebase. **LLM agents must keep this documentation updated** when modifying game logic.

## Quick Links

| Document                                      | Description                             | Source Code                |
| --------------------------------------------- | --------------------------------------- | -------------------------- |
| [Raid Timers](./raids.md)                     | Raid lockouts, tier filtering, grouping | `src/domains/raids/`       |
| [XP & Leveling](./xp-leveling.md)             | XP calculation, bonuses, penalties      | `src/domains/trPlanner/`   |
| [Gear & Affixes](./gear-affixes.md)           | Affix stacking, property calculation    | `src/domains/gearPlanner/` |
| [Augments & Crafting](./augments-crafting.md) | Augment slots, crafting options         | `src/domains/gearPlanner/` |
| [Set Bonuses](./set-bonuses.md)               | Set item thresholds and bonuses         | `src/api/ddoGearPlanner/`  |
| [Ransack Timers](./ransack.md)                | Chest ransack tracking                  | `src/storage/ransackDb.ts` |

## Maintenance Requirements

When modifying any game logic in the codebase:

1. **Update corresponding documentation** in this directory
2. **Verify constants** match the latest DDO game values
3. **Add change notes** with date and reason for the change
4. **Run tests** to ensure logic consistency

## Document Structure

Each document follows this structure:

```markdown
# Feature Name

## Overview

Brief description of the DDO game mechanic

## Game Rules (DDO Official)

The actual game mechanics as defined by DDO

## Implementation

How this codebase implements these rules

## Constants & Configuration

Hardcoded values and their meanings

## Related Files

Links to source code files

## Changelog

History of logic changes
```
