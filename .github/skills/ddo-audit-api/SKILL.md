---
name: ddo-audit-api
description: "DDO Audit REST API integration, endpoints for raid activity, characters, LFMs, guilds, server info. Use when modifying API fetch functions, adding new DDO Audit endpoints, changing request batching, updating character/raid/LFM data types, or troubleshooting API responses."
---

# DDO Audit API Integration

## When to Use

- Adding or modifying DDO Audit API fetch functions
- Changing request batching or caching behavior
- Updating API response types or data structures
- Troubleshooting API connectivity or response format
- Working with character, raid, LFM, guild, or server data

## Base URL

```
https://api.ddoaudit.com/v1
```

Defined in `src/api/ddoAudit/constants.ts`.

## Endpoints

| Endpoint | Function | File |
| --- | --- | --- |
| `GET /characters/ids/{ids}` | `fetchCharactersByIds()` | `characters.ts` |
| `GET /activity/raids?character_ids=...` | `fetchRaidActivity()` | `characters.ts` |
| `GET /lfms/{serverName}` | `fetchLfms()` | `lfms.ts` |
| `GET /characters/by-server-and-guild-name/{server}/{guild}` | `fetchGuildCharacters()` | `guilds.ts` |
| `GET /game/server-info?server=...` | `fetchServerInfo()` | `server.ts` |
| `GET {BASE_URL}/data/quests.json` | `fetchQuestsById()` | `quests.ts` |
| `GET {BASE_URL}/data/areas.json` | `fetchAreasById()` | `areas.ts` |

**Note**: Quests and areas JSON are served locally from `public/data/`, not from the DDO Audit API.

## Request Batching

Characters are fetched in batches of max 30 IDs per request (`MAX_CHARACTER_IDS_PER_REQUEST`).

## Key Data Types

```typescript
interface CharacterData {
  name: string;
  total_level: number;
  race: string;
  classes: Array<{ name: string; level: number }>;
  is_online?: boolean;
  location_id?: string;
  group_id?: string;
  is_in_party?: boolean;
}

interface RaidActivityEntry {
  character_id: string;
  timestamp: string;
  data: { quest_ids: string[] };
}

interface LfmItem {
  id: string | number;
  quest_id: string | number;
  minimum_level: number;
  maximum_level: number;
  leader: LfmCharacter;
  members?: LfmCharacter[];
  activity: LfmActivity[];
  difficulty?: string;
  comment?: string;
}

interface ServerInfo {
  is_online?: boolean | null;
  character_count?: number | null;
  last_status_check?: string | null;
}

interface Quest {
  id: string;
  name: string;
  type: string | null;
  level: number | null;
  heroicLevel: number | null;
  epicLevel: number | null;
  required_adventure_pack: string | null;
  areaId: string | null;
}
```

## Key Constants

| Constant | Value | Purpose |
| --- | --- | --- |
| `DDO_AUDIT_API_BASE_URL` | `https://api.ddoaudit.com/v1` | API base |
| `MAX_CHARACTER_IDS_PER_REQUEST` | 30 | Batch size limit |
| `RAID_LOCKOUT_MS` | 66 hours | Timer duration |
| `HOUR_IN_MS` | 3,600,000 | Time constant |

## Special Behaviors

- **Race normalization**: New races may return as `"Unknown: {id}"` — normalized in code
- **Character caching**: Responses cached in IndexedDB via Dexie
- **LFM response format**: Can be `{data: Record<string, LfmItem>}` or array

## Related Files

| File | Purpose |
| --- | --- |
| `src/api/ddoAudit/constants.ts` | URLs, time constants |
| `src/api/ddoAudit/characters.ts` | Character + raid fetch |
| `src/api/ddoAudit/lfms.ts` | LFM fetch |
| `src/api/ddoAudit/guilds.ts` | Guild character fetch |
| `src/api/ddoAudit/server.ts` | Server info fetch |
| `src/api/ddoAudit/quests.ts` | Quest data (local JSON) |
| `src/api/ddoAudit/areas.ts` | Area data (local JSON) |
| `src/api/ddoAudit/helpers.ts` | Time formatting utilities |
| `src/api/ddoAudit/index.ts` | Public exports |
