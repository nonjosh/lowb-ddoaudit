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

| Endpoint                                                    | Function                                      | File            |
| ----------------------------------------------------------- | --------------------------------------------- | --------------- |
| `GET /characters/ids/{ids}`                                 | `fetchCharactersByIds()`                      | `characters.ts` |
| `GET /characters/{serverName}`                              | `fetchServerCharacters()`                     | `characters.ts` |
| `GET /activity/raids?character_ids=...`                     | `fetchRaidActivity()`                         | `characters.ts` |
| `GET /lfms/{serverName}`                                    | `fetchLfms()`                                 | `lfms.ts`       |
| `GET /characters/by-server-and-guild-name/{server}/{guild}` | `fetchGuildCharacters()`                      | `guilds.ts`     |
| `GET /game/server-info?server=...`                          | `fetchServerInfo()`                           | `server.ts`     |
| `GET /quests?force=false`                                   | `fetchQuestsById()` / `fetchQuestsResponse()` | `quests.ts`     |
| `GET /areas?force=false`                                    | `fetchAreasById()` / `fetchAreasResponse()`   | `areas.ts`      |

**Note**: Quest and area metadata are fetched live from DDO Audit and cached client-side for 24 hours with stale fallback if the network request fails.

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

interface ServerCharacter {
  id: number;
  name: string;
  gender: string;
  race: string;
  total_level: number;
  classes: Array<{ name: string; level: number }>;
  location_id: number;
  guild_name: string;
  server_name: string;
  home_server_name: string;
  group_id: number;
  is_online: boolean;
  is_in_party: boolean;
  is_anonymous: boolean;
}

interface LfmItem {
  id: string | number;
  quest_id: string | number;
  minimum_level: number;
  maximum_level: number;
  accepted_classes?: string[];
  accepted_classes_count?: number;
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

| Constant                        | Value                         | Purpose          |
| ------------------------------- | ----------------------------- | ---------------- |
| `DDOAUDIT_BASE_URL`             | `https://api.ddoaudit.com/v1` | API base         |
| `DDOAUDIT_JSON_CACHE_TTL_MS`    | 24 hours                      | Quest/area cache |
| `MAX_CHARACTER_IDS_PER_REQUEST` | 30                            | Batch size limit |
| `RAID_LOCKOUT_MS`               | 66 hours                      | Timer duration   |
| `HOUR_IN_MS`                    | 3,600,000                     | Time constant    |

## Special Behaviors

- **Race normalization**: New races may return as `"Unknown: {id}"` — normalized in code
- **Character caching**: Responses cached in IndexedDB via Dexie
- **LFM response format**: Can be `{data: Record<string, LfmItem>}` or array

## Related Files

| File                             | Purpose                    |
| -------------------------------- | -------------------------- |
| `src/api/ddoAudit/constants.ts`  | URLs, time constants       |
| `src/api/ddoAudit/characters.ts` | Character + raid fetch     |
| `src/api/ddoAudit/lfms.ts`       | LFM fetch                  |
| `src/api/ddoAudit/guilds.ts`     | Guild character fetch      |
| `src/api/ddoAudit/server.ts`     | Server info fetch          |
| `src/api/ddoAudit/cache.ts`      | Local quest/area TTL cache |
| `src/api/ddoAudit/quests.ts`     | Quest data (live API)      |
| `src/api/ddoAudit/areas.ts`      | Area data (live API)       |
| `src/api/ddoAudit/helpers.ts`    | Time formatting utilities  |
| `src/api/ddoAudit/index.ts`      | Public exports             |
