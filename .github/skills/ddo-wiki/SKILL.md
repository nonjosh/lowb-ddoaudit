---
name: ddo-wiki
description: "DDO Wiki (ddowiki.com) URL patterns, linking conventions, quest page URLs, wiki image URLs, the DdoWikiLink component, and how to fetch wiki data when the site blocks bots. Use when adding wiki links, modifying URL generation, working with item/quest wiki pages, downloading wiki images, or refreshing wiki-sourced data such as sagas.json."
---

# DDO Wiki Integration

## When to Use

- Adding or modifying DDO Wiki links in the UI
- Working with wiki URL generation or formatting
- Downloading or referencing wiki images
- Linking items, quests, or crafting pages to the wiki

## Base URLs

| Purpose     | URL Pattern                             |
| ----------- | --------------------------------------- |
| Wiki pages  | `https://ddowiki.com/page/{PageName}`   |
| Wiki images | `https://images.ddowiki.com/{filename}` |

## URL Conventions

### Item Pages

Items in `items.json` have a `url` field with a **relative path**:

- Format: `/page/ItemName` (e.g., `/page/Bracers_of_the_Sun`)
- Spaces replaced with underscores
- Only relative paths starting with `/page/` are accepted by `getWikiUrl()`

### Quest Pages

Quest names are converted to wiki URLs by replacing spaces with underscores. Use the
shared helper rather than inlining the rule:

```typescript
import { getQuestWikiUrl } from "@/utils/wikiUrls";

getQuestWikiUrl("Shadow Under Thunderholme");
// https://ddowiki.com/page/Shadow_Under_Thunderholme
```

### Augment Pages (Wishlist)

Augments use the `Item:` namespace:

```
https://ddowiki.com/page/Item:{augmentName}
```

### Crafting Pages

| Page                  | URL                                                        |
| --------------------- | ---------------------------------------------------------- |
| Green Steel           | `https://ddowiki.com/page/Green_Steel_item_crafting_steps` |
| Legendary Green Steel | `https://ddowiki.com/page/Legendary_Green_Steel_items`     |
| Viktranium            | `https://ddowiki.com/page/Viktranium_Experiment_crafting`  |

## Components

### DdoWikiLink

**File**: `src/components/shared/DdoWikiLink.tsx`

Renders a clickable link to a DDO Wiki page. Accepts relative or full wiki URLs and converts quest names to proper wiki paths.

### getWikiUrl()

**File**: `src/utils/affixHelpers.tsx`

Converts a relative wiki path (`/page/...`) to a full `https://ddowiki.com/page/...` URL. Only processes paths starting with `/page/`.

## Fetching Wiki Data (bots are blocked)

The wiki rejects automated requests, so refreshing any wiki-sourced data needs a proxy.
Tried and confirmed:

| Method | Result |
| --- | --- |
| `fetch("https://ddowiki.com/page/Saga")` | **403 Forbidden** |
| `https://ddowiki.com/api.php?action=parse…` (MediaWiki API) | **403 Forbidden** |
| `https://ddowiki.com/index.php?title=Saga&action=raw` | **403 Forbidden** |
| `https://ddocompendium.com/w/Favor` | **403** (Cloudflare) |
| `https://web.archive.org/web/…id_/https://ddowiki.com/page/Saga` | **202** JS challenge, no content |
| `https://r.jina.ai/https://ddowiki.com/page/Saga` | **200**, page as Markdown ✅ |

### Working method: the Jina reader proxy

```typescript
const response = await fetch("https://r.jina.ai/https://ddowiki.com/page/Saga", {
  headers: { accept: "text/plain" },
});
const markdown = await response.text(); // first lines: "Title:", "URL Source:", "Markdown Content:"
```

Rules of thumb:

- **One request per page per run.** The reader is a third-party service; do not loop over
  pages you can avoid. The Saga page is a single request for all 31 sagas precisely
  because its quest matrix is on one page.
- **Commit the parsed result**, never fetch at runtime. Pages and the server read only
  `src/data/*.json`.
- **Verify before writing.** Compare the parsed result against numbers the page states
  (e.g. "Consists of: 13 quests", "14 heroic sagas") and fail loudly on mismatch.
- The proxy rewrites long links and can split one cell into two links
  (`[The Planes-](…) [walker's Path (Epic)](…)`). When reading a cell, join **all**
  link texts and strip a trailing hyphen from the non-final parts. A regex like
  `\[([^\]]+)\]\(` per cell is enough; do not match the whole line.

### Parsing Markdown tables

The reader renders wiki tables as pipe tables:

```
| Quest Name | Quest Level (Heroic) | [Saga A](…) | [Saga B](…) |
| --- | --- | --- | --- |
| [Irestone Inlet](…) | 4 | Yes |  |
```

Split a row with `line.split("|").slice(1, -1)`, then remember the offset:

- header: `cells[0]` is `Quest Name`, `cells[1]` the level, `cells[2..]` the saga columns;
- data row: `cells[0]` quest, `cells[1]` level, `cells[2..]` the `Yes` marks.

An off-by-one here silently shifts every membership (it did once — the rows looked
plausible, only the "14 heroic sagas" cross-check caught it).

### Known dataset: sagas

Page: `https://ddowiki.com/page/Saga`, script: `scripts/update-sagas.ts`,
output: `src/data/sagas.json`.

| Section | Use |
| --- | --- |
| `## Sagas by Quest Name` → `### Heroic (levels 1-12)`, `### Heroic (levels 13-19)`, `### Epic`, `### Legendary` | the quest × saga matrix (4 tables) |
| `## List of Sagas` → `### Heroic/Epic/Legendary Sagas` bullets | level range in parentheses, adventure packs as links after "requires" |

A saga can appear in more than one matrix (e.g. `Mists of Ravenloft (Epic)` is an Epic
saga listed under the Legendary table too); take the union of its quests and bucket it
by the `List of Sagas` section it appears in. Quest names come from the wiki and may not
exist in the DDO Audit API — that is expected, and `build-quest-groupings.ts` simply
skips them.

After refreshing sagas:

```sh
npx tsx scripts/update-sagas.ts        # sagas.json
npx tsx scripts/build-quest-groupings.ts   # questGroupings.json (also flags wilderness areas)
```

### Adding a new wiki-sourced dataset

1. Write `scripts/update-<thing>.ts` that fetches one page through the reader proxy.
2. Parse tables with the cell offset rules above; throw if the expected header row is
   missing rather than writing a partial file.
3. Cross-check a count the page states, then `console.log` a short summary.
4. Write `src/data/<thing>.json` (sorted, stable key order) and commit it.
5. Have the app read the snapshot, not the wiki; update this skill with the page,
   script and output.

## Wiki Images

**Script**: `scripts/download-ingredient-images.ts`

Downloads ingredient icons from `https://images.ddowiki.com/` for local use in `public/ingredients/`. Used for crafting ingredient display (Bleak, Green Steel, Viktranium items).

## Related Files

| File                                    | Purpose                |
| --------------------------------------- | ---------------------- |
| `src/components/shared/DdoWikiLink.tsx` | Wiki link component    |
| `src/utils/affixHelpers.tsx`            | `getWikiUrl()` helper  |
| `scripts/download-ingredient-images.ts` | Image downloader       |
| `public/ingredients/`                   | Downloaded wiki images |
