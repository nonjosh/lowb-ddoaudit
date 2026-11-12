#!/usr/bin/env npx tsx
/* eslint-disable no-undef */
/**
 * Checks whether any PATCHED_AREAS entry in src/api/ddoAudit/areas.ts is still needed.
 *
 * Usage: npx tsx scripts/check-area-patches.ts
 *
 * Run weekly by .github/workflows/check-area-patches.yml. Exits 1 when an entry can be
 * removed (upstream now matches, or a flags-only patch targets a record that is gone),
 * so the scheduled run turns red until the list is cleaned up.
 */

import { PATCHED_AREAS } from '../src/api/ddoAudit/areas'
import { AREAS_JSON_URL } from '../src/api/ddoAudit/constants'

// The URL the client itself reads, so an entry is only called stale when the app sees
// the corrected record too (upstream's cache can lag behind its source).
const AREAS_URL = AREAS_JSON_URL

interface UpstreamArea {
  id: string | number
  name?: string | null
  is_public?: boolean | null
  is_wilderness?: boolean | null
}

async function main() {
  const response = await fetch(AREAS_URL, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Failed to fetch areas (${response.status})`)

  const payload = (await response.json()) as { data?: UpstreamArea[] } | UpstreamArea[]
  const list = Array.isArray(payload) ? payload : (payload.data ?? [])
  // An empty feed would otherwise read as "every record was deleted".
  if (list.length === 0) throw new Error('areas feed returned no records')
  const upstream = new Map(list.map((area) => [String(area.id ?? '').trim(), area]))

  const stale: string[] = []

  for (const patch of PATCHED_AREAS) {
    const area = upstream.get(patch.id)

    if (!area) {
      if (patch.name === undefined) {
        stale.push(patch.id)
        console.log(`- ${patch.id}: not upstream and has no name to seed — remove the entry`)
      } else {
        console.log(`- ${patch.id}: not upstream, still seeding "${patch.name}"`)
      }
      continue
    }

    // Compare the values fetchAreasById would apply: trimmed name, boolean flags.
    const mismatches: string[] = []
    if (patch.name !== undefined && patch.name !== String(area.name ?? '').trim()) mismatches.push('name')
    if (patch.is_public !== undefined && patch.is_public !== !!area.is_public) mismatches.push('is_public')
    if (patch.is_wilderness !== undefined && patch.is_wilderness !== !!area.is_wilderness) {
      mismatches.push('is_wilderness')
    }

    if (mismatches.length === 0) {
      stale.push(patch.id)
      console.log(`- ${patch.id}: upstream now matches every patched field — remove the entry`)
    } else {
      console.log(`- ${patch.id}: still patching ${mismatches.join(', ')}`)
    }
  }

  if (stale.length > 0) {
    console.error(`\n${stale.length} PATCHED_AREAS entr${stale.length === 1 ? 'y' : 'ies'} can be removed: ${stale.join(', ')}`)
    process.exitCode = 1
    return
  }

  console.log(
    PATCHED_AREAS.length === 0
      ? '\nPATCHED_AREAS is empty — nothing to check.'
      : '\nEvery PATCHED_AREAS entry is still needed.',
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
