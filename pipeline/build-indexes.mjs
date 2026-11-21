/**
 * Prebuild one compact MiniSearch index per collection, gzipped so a phone
 * downloads a fraction of the raw size. The app decompresses with the browser's
 * built-in DecompressionStream and loads indexes lazily.
 *
 * The collection list and shard paths come from the built book data itself, not
 * from the pipeline's summary cache, so a fresh clone can rebuild every index
 * with one command.
 *
 * Run: npm run data:indexes
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import MiniSearch from 'minisearch'
import { ROOT, DATA, BOOKS, ensureDirs } from './lib.mjs'

await ensureDirs()
const INDEX_DIR = path.join(DATA, 'index')
await fs.mkdir(INDEX_DIR, { recursive: true })

for (const stale of await fs.readdir(INDEX_DIR).catch(() => [])) {
  await fs.unlink(path.join(INDEX_DIR, stale)).catch(() => undefined)
}

const bookFiles = await fs.readdir(BOOKS).catch(() => [])

/** Shards of one collection, in reading order (`id.json` or `id-1.json`, `id-2.json`, …). */
function shardsOf(id, files) {
  return files
    .map((name) => {
      if (name === `${id}.json`) return { name, part: 1 }
      const rest = name.startsWith(`${id}-`) ? name.slice(id.length + 1) : ''
      const m = rest.match(/^(\d+)\.json$/)
      return m ? { name, part: Number(m[1]) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.part - b.part)
    .map((s) => `data/books/${s.name}`)
}

const collections = []
for (const file of bookFiles.filter((f) => f.endsWith('-chapters.json'))) {
  const meta = JSON.parse(await fs.readFile(path.join(BOOKS, file), 'utf8'))
  const id = meta.book?.id
  if (!id || collections.some((c) => c.id === id)) continue
  const files = shardsOf(id, bookFiles)
  if (!files.length) {
    console.warn(`  ! ${id}: chapter index without any book shard, skipped`)
    continue
  }
  const first = JSON.parse(await fs.readFile(path.join(ROOT, 'public', files[0]), 'utf8'))
  collections.push({
    id,
    religion: first.book?.religion || meta.book?.religion,
    translationName: meta.book?.translationName || first.book?.translationName,
    files,
  })
}

let total = 0
for (const meta of collections) {
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
  for (const shard of meta.files) {
    const json = JSON.parse(await fs.readFile(path.join(ROOT, 'public', shard), 'utf8'))
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

if (!collections.length) throw new Error('No book data found in public/data/books')

console.log(`  ✓ ${collections.length} indexes, ${total.toLocaleString()} verses indexed`)
