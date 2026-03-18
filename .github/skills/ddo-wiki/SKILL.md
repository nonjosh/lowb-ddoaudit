---
name: ddo-wiki
description: "DDO Wiki (ddowiki.com) URL patterns, linking conventions, item page URLs, quest page URLs, wiki image URLs, and the DdoWikiLink component. Use when adding wiki links, modifying URL generation, working with item/quest wiki pages, or downloading wiki images."
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

Quest names are converted to wiki URLs by replacing spaces with underscores:

```typescript
questName.replace(/\s+/g, "_");
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
