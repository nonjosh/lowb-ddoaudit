#!/usr/bin/env npx tsx
/**
 * Script to download ingredient images from DDO Wiki to public/ingredients/
 *
 * For each ingredient, tries multiple DDO Wiki URL patterns. If none succeed,
 * copies the generic Ingredient_Bag.png fallback.
 *
 * Usage: npx tsx scripts/download-ingredient-images.ts
 */

import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import * as process from 'process'

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'ingredients')
const WIKI_IMAGE_BASE = 'https://images.ddowiki.com'
const FALLBACK_IMAGE = `${WIKI_IMAGE_BASE}/Ingredient_Bag.png`

// ============================================================================
// Ingredient definitions for all 3 crafting systems
// ============================================================================

/**
 * Map from ingredient name (as used in code) to an array of candidate wiki
 * image filenames to try, in order of priority.
 */
const INGREDIENT_IMAGE_CANDIDATES: Record<string, string[]> = {
  // ── Viktranium – Heroic ───────────────────────────────────────────────
  'Bleak Alternator': ['Bleak_Alternator_icon.png', 'IngIcon_BleakAlternator.png'],
  'Bleak Conductor': ['Bleak_Conductor_icon.png', 'IngIcon_BleakConductor.png'],
  'Bleak Insulator': ['Bleak_Insulator_icon.png', 'IngIcon_BleakInsulator.png'],
  'Bleak Resistor': ['Bleak_Resistor_icon.png', 'IngIcon_BleakResistor.png'],
  'Bleak Wire': ['Bleak_Wire_icon.png', 'IngIcon_BleakWire.png'],
  'Bleak Transformer': ['Bleak_Transformer_icon.png', 'IngIcon_BleakTransformer.png'],

  // ── Viktranium – Legendary ────────────────────────────────────────────
  // Legendary variants reuse heroic icons on the wiki
  'Legendary Bleak Alternator': ['Legendary_Bleak_Alternator_icon.png', 'Bleak_Alternator_icon.png', 'IngIcon_LegendaryBleakAlternator.png'],
  'Legendary Bleak Conductor': ['Legendary_Bleak_Conductor_icon.png', 'Bleak_Conductor_icon.png', 'IngIcon_LegendaryBleakConductor.png'],
  'Legendary Bleak Insulator': ['Legendary_Bleak_Insulator_icon.png', 'Bleak_Insulator_icon.png', 'IngIcon_LegendaryBleakInsulator.png'],
  'Legendary Bleak Resistor': ['Legendary_Bleak_Resistor_icon.png', 'Bleak_Resistor_icon.png', 'IngIcon_LegendaryBleakResistor.png'],
  'Legendary Bleak Wire': ['Legendary_Bleak_Wire_icon.png', 'Bleak_Wire_icon.png', 'IngIcon_LegendaryBleakWire.png'],
  'Legendary Bleak Transformer': ['Legendary_Bleak_Transformer_icon.png', 'Bleak_Transformer_icon.png', 'IngIcon_LegendaryBleakTransformer.png'],
  'Legendary Bleak Memento': ['Legendary_Bleak_Memento_icon.png', 'IngIcon_LegendaryBleakMemento.png'],

  // ── Green Steel – Essences ────────────────────────────────────────────
  'Diluted Ethereal Essence': ['Diluted_Ethereal_Essence_icon.png', 'IngIcon_DilutedEtherealEssence.png'],
  'Diluted Material Essence': ['Diluted_Material_Essence_icon.png', 'IngIcon_DilutedMaterialEssence.png'],
  'Distilled Ethereal Essence': ['Distilled_Ethereal_Essence_icon.png', 'IngIcon_DistilledEtherealEssence.png'],
  'Distilled Material Essence': ['Distilled_Material_Essence_icon.png', 'IngIcon_DistilledMaterialEssence.png'],
  'Pure Ethereal Essence': ['Pure_Ethereal_Essence_icon.png', 'IngIcon_PureEtherealEssence.png'],
  'Pure Material Essence': ['Pure_Material_Essence_icon.png', 'IngIcon_PureMaterialEssence.png'],

  // ── Green Steel – Gems ────────────────────────────────────────────────
  'Cloudy Gem of Opposition': ['Cloudy_Gem_of_Opposition_icon.png', 'IngIcon_CloudyGemofOpposition.png'],
  'Cloudy Gem of Dominion': ['Cloudy_Gem_of_Dominion_icon.png', 'IngIcon_CloudyGemofDominion.png'],
  'Cloudy Gem of Escalation': ['Cloudy_Gem_of_Escalation_icon.png', 'IngIcon_CloudyGemofEscalation.png'],
  'Pristine Gem of Opposition': ['Pristine_Gem_of_Opposition_icon.png', 'IngIcon_PristineGemofOpposition.png'],
  'Pristine Gem of Dominion': ['Pristine_Gem_of_Dominion_icon.png', 'IngIcon_PristineGemofDominion.png'],
  'Pristine Gem of Escalation': ['Pristine_Gem_of_Escalation_icon.png', 'IngIcon_PristineGemofEscalation.png'],
  'Flawless Gem of Opposition': ['Flawless_Gem_of_Opposition_icon.png', 'IngIcon_FlawlessGemofOpposition.png'],
  'Flawless Gem of Dominion': ['Flawless_Gem_of_Dominion_icon.png', 'IngIcon_FlawlessGemofDominion.png'],
  'Flawless Gem of Escalation': ['Flawless_Gem_of_Escalation_icon.png', 'IngIcon_FlawlessGemofEscalation.png'],

  // ── Green Steel – Energy Cells ────────────────────────────────────────
  'Shavarath Low Energy Cell': ['Shavarath_Low_Energy_Cell_icon.png', 'IngIcon_ShavarrathLowEnergyCell.png'],
  'Shavarath Medium Energy Cell': ['Shavarath_Medium_Energy_Cell_icon.png', 'IngIcon_ShavarrathMediumEnergyCell.png'],
  'Shavarath High Energy Cell': ['Shavarath_High_Energy_Cell_icon.png', 'IngIcon_ShavarrathHighEnergyCell.png'],

  // ── LGS – Twisted Shrapnel (Water) ───────────────────────────────────
  'Legendary Small Twisted Shrapnel': ['Legendary_Small_Twisted_Shrapnel_icon.png', 'IngIcon_LegendaryShrapnel.png', 'IngIcon_LegendaryTwistedShrapnel.png'],
  'Legendary Medium Twisted Shrapnel': ['Legendary_Medium_Twisted_Shrapnel_icon.png', 'IngIcon_LegendaryShrapnel.png', 'IngIcon_LegendaryTwistedShrapnel.png'],
  'Legendary Large Twisted Shrapnel': ['Legendary_Large_Twisted_Shrapnel_icon.png', 'IngIcon_LegendaryShrapnel.png', 'IngIcon_LegendaryTwistedShrapnel.png'],

  // ── LGS – Devil Scales (Fire) ────────────────────────────────────────
  'Legendary Small Devil Scales': ['Legendary_Small_Devil_Scales_icon.png', 'IngIcon_LegendaryDevilScales.png', 'IngIcon_LegendaryScale.png'],
  'Legendary Medium Devil Scales': ['Legendary_Medium_Devil_Scales_icon.png', 'IngIcon_LegendaryDevilScales.png', 'IngIcon_LegendaryScale.png'],
  'Legendary Large Devil Scales': ['Legendary_Large_Devil_Scales_icon.png', 'IngIcon_LegendaryDevilScales.png', 'IngIcon_LegendaryScale.png'],

  // ── LGS – Sulfurous Stone (Earth) ────────────────────────────────────
  'Legendary Small Sulfurous Stone': ['Legendary_Small_Sulfurous_Stone_icon.png', 'IngIcon_LegendarySulfurousStone.png', 'IngIcon_LegendaryStone.png'],
  'Legendary Medium Sulfurous Stone': ['Legendary_Medium_Sulfurous_Stone_icon.png', 'IngIcon_LegendarySulfurousStone.png', 'IngIcon_LegendaryStone.png'],
  'Legendary Large Sulfurous Stone': ['Legendary_Large_Sulfurous_Stone_icon.png', 'IngIcon_LegendarySulfurousStone.png', 'IngIcon_LegendaryStone.png'],

  // ── LGS – Arrowhead (Air) ────────────────────────────────────────────
  'Legendary Small Arrowhead': ['Legendary_Small_Arrowhead_icon.png', 'IngIcon_LegendaryArrowhead.png', 'IngIcon_LegendaryArrow.png'],
  'Legendary Medium Arrowhead': ['Legendary_Medium_Arrowhead_icon.png', 'IngIcon_LegendaryArrowhead.png', 'IngIcon_LegendaryArrow.png'],
  'Legendary Large Arrowhead': ['Legendary_Large_Arrowhead_icon.png', 'IngIcon_LegendaryArrowhead.png', 'IngIcon_LegendaryArrow.png'],

  // ── LGS – Bones (Positive) ───────────────────────────────────────────
  'Legendary Small Bones': ['Legendary_Small_Bones_icon.png', 'IngIcon_LegendaryBones.png', 'IngIcon_LegendaryBone.png'],
  'Legendary Medium Bones': ['Legendary_Medium_Bones_icon.png', 'IngIcon_LegendaryBones.png', 'IngIcon_LegendaryBone.png'],
  'Legendary Large Bones': ['Legendary_Large_Bones_icon.png', 'IngIcon_LegendaryBones.png', 'IngIcon_LegendaryBone.png'],

  // ── LGS – Stone of Change (Negative) ─────────────────────────────────
  'Legendary Small Stone of Change': ['Legendary_Small_Stone_of_Change_icon.png', 'IngIcon_LegendaryStoneOfChange.png', 'IngIcon_LegendaryChain.png'],
  'Legendary Medium Stone of Change': ['Legendary_Medium_Stone_of_Change_icon.png', 'IngIcon_LegendaryStoneOfChange.png', 'IngIcon_LegendaryChain.png'],
  'Legendary Large Stone of Change': ['Legendary_Large_Stone_of_Change_icon.png', 'IngIcon_LegendaryStoneOfChange.png', 'IngIcon_LegendaryChain.png'],

  // ── LGS – Energy Cells ───────────────────────────────────────────────
  'Legendary Low Energy Cell': ['Legendary_Low_Energy_Cell_icon.png', 'IngIcon_LegendaryLowEnergyCell.png'],
  'Legendary Medium Energy Cell': ['Legendary_Medium_Energy_Cell_icon.png', 'IngIcon_LegendaryMediumEnergyCell.png'],
  'Legendary High Energy Cell': ['Legendary_High_Energy_Cell_icon.png', 'IngIcon_LegendaryHighEnergyCell.png'],
}

// ============================================================================
// Download helpers
// ============================================================================

/** Download a URL and save to disk. Returns true on success. */
function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        downloadFile(response.headers.location!, dest).then(resolve)
        return
      }
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        resolve(false)
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        // Verify the file has >0 bytes
        const stats = fs.statSync(dest)
        if (stats.size === 0) {
          fs.unlinkSync(dest)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    }).on('error', () => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      resolve(false)
    })
  })
}

/** Standard local filename for an ingredient name */
function toLocalFilename(ingredientName: string): string {
  return `${ingredientName.replace(/ /g, '_')}_icon.png`
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true })
    console.log(`Created directory: ${PUBLIC_DIR}`)
  }

  // First download the fallback image (always needed)
  const fallbackDest = path.join(PUBLIC_DIR, 'Ingredient_Bag.png')
  if (!fs.existsSync(fallbackDest)) {
    console.log('Downloading fallback image (Ingredient_Bag.png)...')
    const ok = await downloadFile(FALLBACK_IMAGE, fallbackDest)
    if (!ok) {
      console.error('FATAL: Could not download fallback image')
      process.exit(1)
    }
    console.log('  ✓ Fallback image downloaded')
  } else {
    console.log('Fallback image already exists')
  }

  let specific = 0
  let fallbackUsed = 0
  let alreadyExists = 0

  for (const [name, candidates] of Object.entries(INGREDIENT_IMAGE_CANDIDATES)) {
    const localFile = toLocalFilename(name)
    const dest = path.join(PUBLIC_DIR, localFile)

    // Skip if already downloaded
    if (fs.existsSync(dest)) {
      console.log(`  ⏭  ${name} (already exists)`)
      alreadyExists++
      continue
    }

    console.log(`Fetching ${name}...`)
    let found = false

    // Try each candidate URL
    for (const candidate of candidates) {
      const url = `${WIKI_IMAGE_BASE}/${candidate}`
      const ok = await downloadFile(url, dest)
      if (ok) {
        console.log(`  ✓ ${name}  ← ${candidate}`)
        specific++
        found = true
        break
      }
    }

    // Fall back to Ingredient_Bag.png
    if (!found) {
      fs.copyFileSync(fallbackDest, dest)
      console.log(`  ⬜ ${name}  ← Ingredient_Bag.png (fallback)`)
      fallbackUsed++
    }
  }

  console.log(`\nDone: ${specific} with wiki icon, ${fallbackUsed} using fallback, ${alreadyExists} already existed`)
  console.log(`Total ingredient images: ${Object.keys(INGREDIENT_IMAGE_CANDIDATES).length}`)
  console.log(`Images saved to: ${PUBLIC_DIR}`)
}

main().catch(console.error)
