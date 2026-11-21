/**
 * Build everything: every bundled collection, then search indexes, then the
 * registry and verse-of-the-day data.
 *
 * Run: npm run data:all
 *
 * Each step is resumable: downloads are cached under pipeline/.cache, so an
 * interrupted run picks up where it left off.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const STEPS = [
  ['fetch-quran.mjs', 'Qur’an'],
  ['fetch-hadith.mjs', 'Hadith (Bukhari, Muslim)'],
  ['fetch-bible.mjs', 'Bible (KJV + Hebrew + Greek)'],
  ['fetch-tanakh.mjs', 'Tanakh (Hebrew + JPS 1917)'],
  ['fetch-gita.mjs', 'Bhagavad Gita'],
  ['fetch-dhammapada.mjs', 'Dhammapada'],
  ['fetch-guru-granth.mjs', 'Sri Guru Granth Sahib'],
  ['fetch-tao.mjs', 'Tao Te Ching'],
  ['fetch-analects.mjs', 'Analects'],
  ['fetch-upanishads.mjs', 'Upanishads'],
  ['fetch-rigveda.mjs', 'Rig Veda'],
  ['fetch-yogasutras.mjs', 'Yoga Sutras'],
  ['build-indexes.mjs', 'Search indexes'],
  ['build-registry.mjs', 'Registry & verse of the day'],
]

let failed = 0
for (const [script, label] of STEPS) {
  console.log(`\n▶ ${label} (${script})`)
  const result = spawnSync(process.execPath, [path.join(HERE, script)], {
    stdio: 'inherit',
    cwd: path.dirname(HERE),
  })
  if (result.status !== 0) {
    failed++
    console.error(`✗ ${label} failed with exit code ${result.status}`)
  }
}

if (failed) {
  console.error(`\n${failed} step(s) failed. Fix the errors and run npm run data:all again.`)
  process.exit(1)
}
console.log('\n✓ All collections, indexes and registry built.')
