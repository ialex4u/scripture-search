/**
 * Prebuild one compact MiniSearch index per collection, gzipped so a phone
 * downloads a fraction of the raw size. The app decompresses with the browser's
 * built-in DecompressionStream and loads indexes lazily.
 *
 * Run: npm run data:indexes
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import MiniSearch from 'minisearch'
import { ROOT, DATA, SUMMARIES, ensureDirs } from './lib.mjs'

await ensureDirs()
const INDEX_DIR = path.join(DATA, 'index')
await fs.mkdir(INDEX_DIR, { recursive: true })

for (const stale of await fs.readdir(INDEX_DIR).catch(() => [])) {
  await fs.unlink(path.join(INDEX_DIR, stale)).catch(() => undefined)
}

const summaries = (await fs.readdir(SUMMARIES).catch(() => [])).filter((f) => f.endsWith('.json'))

let total = 0
for (const file of summaries) {
  const meta = JSON.parse(await fs.readFile(path.join(SUMMARIES, file), 'utf8'))
  const index = new MiniSearch({
    // Search covers the translation, the transliteration, and theme tags.
    fields: ['translation', 'translit', 'tags'],
    storeFields: [
      'id',
      'ref',
      'religion',
      'book',
      'bookId',
      'chapter',
      'chapterTitle',
      'verse',
      'translation',
      'translit',
      'translationName',
      'translator',
      'tags',
    ],
    idField: 'id',
  })
  let count = 0
  for (const shard of meta.files || []) {
    const json = JSON.parse(await fs.readFile(path.join(ROOT, 'public', shard.path), 'utf8'))
    for (const chapter of json.chapters) {
      for (const verse of chapter.verses) {
        index.add({
          ...verse,
          bookId: meta.id,
          translationName: verse.translationName || meta.translationName,
        })
        count++
      }
    }
  }
  const json = JSON.stringify(index.toJSON())
  const gz = zlib.gzipSync(Buffer.from(json), { level: 9 })
  await fs.writeFile(path.join(INDEX_DIR, `${meta.id}.json.gz`), gz)
  total += count
  console.log(
    `  ✓ index ${meta.id}: ${count} verses, ${(json.length / 1024 / 1024).toFixed(1)} MB → ${(gz.length / 1024 / 1024).toFixed(1)} MB gz`,
  )
}

console.log(`  ✓ ${summaries.length} indexes, ${total.toLocaleString()} verses indexed`)
