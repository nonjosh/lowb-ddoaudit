#!/usr/bin/env npx tsx
/**
 * Script to download ingredient images from DDO Wiki to public/ingredients/
 *
 * Usage: npx tsx scripts/download-ingredient-images.ts
 */

import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import * as process from 'process'

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'ingredients')

// Map from ingredient name to DDO wiki image filename
const INGREDIENT_IMAGES: Record<string, string> = {
  // Viktranium - Heroic
  'Bleak Alternator': 'Bleak_Alternator.png',
  'Bleak Conductor': 'Bleak_Conductor.png',
  'Bleak Insulator': 'Bleak_Insulator.png',
  'Bleak Resistor': 'Bleak_Resistor.png',
  'Bleak Transformer': 'Bleak_Transformer.png',
  // Viktranium - Legendary
  'Legendary Bleak Alternator': 'Legendary_Bleak_Alternator.png',
  'Legendary Bleak Conductor': 'Legendary_Bleak_Conductor.png',
  'Legendary Bleak Insulator': 'Legendary_Bleak_Insulator.png',
  'Legendary Bleak Resistor': 'Legendary_Bleak_Resistor.png',
  'Legendary Bleak Transformer': 'Legendary_Bleak_Transformer.png',
  // Green Steel - Essences
  'Diluted Ethereal Essence': 'Diluted_Ethereal_Essence.png',
  'Diluted Material Essence': 'Diluted_Material_Essence.png',
  'Distilled Ethereal Essence': 'Distilled_Ethereal_Essence.png',
  'Distilled Material Essence': 'Distilled_Material_Essence.png',
  'Pure Ethereal Essence': 'Pure_Ethereal_Essence.png',
  'Pure Material Essence': 'Pure_Material_Essence.png',
  // Green Steel - Gems
  'Cloudy Gem of Opposition': 'Cloudy_Gem_of_Opposition.png',
  'Cloudy Gem of Dominion': 'Cloudy_Gem_of_Dominion.png',
  'Cloudy Gem of Escalation': 'Cloudy_Gem_of_Escalation.png',
  'Pristine Gem of Opposition': 'Pristine_Gem_of_Opposition.png',
  'Pristine Gem of Dominion': 'Pristine_Gem_of_Dominion.png',
  'Pristine Gem of Escalation': 'Pristine_Gem_of_Escalation.png',
  'Flawless Gem of Opposition': 'Flawless_Gem_of_Opposition.png',
  'Flawless Gem of Dominion': 'Flawless_Gem_of_Dominion.png',
  'Flawless Gem of Escalation': 'Flawless_Gem_of_Escalation.png',
  // Green Steel - Energy Cells
  'Shavarath Low Energy Cell': 'Shavarath_Low_Energy_Cell.png',
  'Shavarath Medium Energy Cell': 'Shavarath_Medium_Energy_Cell.png',
  'Shavarath High Energy Cell': 'Shavarath_High_Energy_Cell.png',
  // LGS - Ingredients
  'Legendary Small Twisted Shrapnel': 'Legendary_Small_Twisted_Shrapnel.png',
  'Legendary Medium Twisted Shrapnel': 'Legendary_Medium_Twisted_Shrapnel.png',
  'Legendary Large Twisted Shrapnel': 'Legendary_Large_Twisted_Shrapnel.png',
  'Legendary Small Devil Scales': 'Legendary_Small_Devil_Scales.png',
  'Legendary Medium Devil Scales': 'Legendary_Medium_Devil_Scales.png',
  'Legendary Large Devil Scales': 'Legendary_Large_Devil_Scales.png',
  'Legendary Small Sulfurous Stone': 'Legendary_Small_Sulfurous_Stone.png',
  'Legendary Medium Sulfurous Stone': 'Legendary_Medium_Sulfurous_Stone.png',
  'Legendary Large Sulfurous Stone': 'Legendary_Large_Sulfurous_Stone.png',
  'Legendary Small Arrowhead': 'Legendary_Small_Arrowhead.png',
  'Legendary Medium Arrowhead': 'Legendary_Medium_Arrowhead.png',
  'Legendary Large Arrowhead': 'Legendary_Large_Arrowhead.png',
  'Legendary Small Bones': 'Legendary_Small_Bones.png',
  'Legendary Medium Bones': 'Legendary_Medium_Bones.png',
  'Legendary Large Bones': 'Legendary_Large_Bones.png',
  'Legendary Small Stone of Change': 'Legendary_Small_Stone_of_Change.png',
  'Legendary Medium Stone of Change': 'Legendary_Medium_Stone_of_Change.png',
  'Legendary Large Stone of Change': 'Legendary_Large_Stone_of_Change.png',
  // LGS - Energy Cells
  'Legendary Low Energy Cell': 'Legendary_Low_Energy_Cell.png',
  'Legendary Medium Energy Cell': 'Legendary_Medium_Energy_Cell.png',
  'Legendary High Energy Cell': 'Legendary_High_Energy_Cell.png',
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  Skipping ${path.basename(dest)} (already exists)`)
      resolve()
      return
    }

    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        file.close()
        fs.unlinkSync(dest)
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject)
        return
      }
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true })
    console.log(`Created directory: ${PUBLIC_DIR}`)
  }

  let success = 0
  let failed = 0

  for (const [name, filename] of Object.entries(INGREDIENT_IMAGES)) {
    const dest = path.join(PUBLIC_DIR, filename)
    // DDO wiki direct image URL pattern
    const directUrl = `https://ddowiki.com/images/${filename}`
    console.log(`Fetching ${name}...`)
    try {
      await downloadFile(directUrl, dest)
      console.log(`  ✓ ${name}`)
      success++
    } catch (err) {
      console.log(`  ✗ ${name}: ${err}`)
      failed++
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`)
  console.log(`Images saved to: ${PUBLIC_DIR}`)
}

main().catch(console.error)
