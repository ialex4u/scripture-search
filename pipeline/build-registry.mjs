/**
 * Build public/data/registry.json from the per-collection summaries, add the
 * catalogue entries for texts that are not bundled (with an honest reason),
 * copy the synonym map, and generate the verse-of-the-day rotation.
 *
 * Run: npm run data:registry
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { ROOT, DATA, BOOKS, SUMMARIES, loadThemes, ensureDirs } from './lib.mjs'

await ensureDirs()

const CATALOG = [
  {
    religion: 'Islam',
    books: [
      { id: 'quran' },
      { id: 'bukhari' },
      { id: 'muslim' },
      {
        id: 'abudawud',
        title: 'Sunan Abu Dawud',
        reason:
          'Machine-readable Arabic + English is available in the open hadith-api dataset; run `npm run data:hadith abudawud tirmidhi nasai ibnmajah` to bundle it.',
      },
      {
        id: 'tirmidhi',
        title: "Jami' at-Tirmidhi",
        reason: 'Supported by the pipeline; not bundled in this build to keep the download small.',
      },
      {
        id: 'nasai',
        title: "Sunan an-Nasa'i",
        reason: 'Supported by the pipeline; not bundled in this build to keep the download small.',
      },
      {
        id: 'ibnmajah',
        title: 'Sunan Ibn Majah',
        reason: 'Supported by the pipeline; not bundled in this build to keep the download small.',
      },
      {
        id: 'malik',
        title: "Muwatta Malik",
        reason:
          'No verified openly licensed Arabic + English edition was reachable during this build; content is not included rather than risk a copyright problem.',
      },
    ],
  },
  { religion: 'Christianity', books: [{ id: 'bible' }] },
  {
    religion: 'Hinduism',
    books: [
      { id: 'gita' },
      { id: 'rigveda' },
      { id: 'upanishads' },
      { id: 'yogasutras' },
      {
        id: 'samaveda',
        title: 'Sama Veda',
        reason: 'No complete openly licensed English edition was reachable during this build.',
      },
      {
        id: 'yajurveda',
        title: 'Yajur Veda',
        reason: 'No complete openly licensed English edition was reachable during this build.',
      },
      {
        id: 'atharvaveda',
        title: 'Atharva Veda',
        reason: 'No complete openly licensed English edition was reachable during this build.',
      },
      {
        id: 'ramayana',
        title: 'Ramayana',
        reason:
          'Griffith’s public-domain translation is not available as a clean machine-readable edition here; a verse-by-verse import is needed.',
      },
      {
        id: 'mahabharata',
        title: 'Mahabharata',
        reason:
          'Ganguli’s public-domain translation is very large; it needs a dedicated import and verse segmentation pass that this build did not complete.',
      },
      {
        id: 'puranas',
        title: 'The Puranas',
        reason:
          'Only partial public-domain translations (e.g. Wilson’s Vishnu Purana) exist and no reliable structured copy was reachable.',
      },
    ],
  },
  {
    religion: 'Buddhism',
    books: [
      { id: 'dhammapada' },
      {
        id: 'tripitaka',
        title: 'Tripitaka / Pali Canon',
        reason:
          'The full canon is enormous. SuttaCentral (CC0) is the right source, but its bulk export was not reachable as structured files during this build.',
      },
      {
        id: 'heart-sutra',
        title: 'Heart Sutra',
        reason:
          'Public-domain translations exist; the Chinese original and English needed manual alignment that this build did not complete.',
      },
      {
        id: 'diamond-sutra',
        title: 'Diamond Sutra',
        reason:
          'Public-domain translations exist; no clean machine-readable parallel edition was reachable.',
      },
      {
        id: 'lotus-sutra',
        title: 'Lotus Sutra',
        reason:
          'Kern’s 1884 public-domain translation is identified in the Sacred Books of the East, but the reachable copy was not cleanly segmented by chapter.',
      },
    ],
  },
  { religion: 'Sikhism', books: [{ id: 'guru-granth-sahib' }] },
  {
    religion: 'Judaism',
    books: [
      {
        id: 'tanakh',
        title: 'Tanakh (Torah, Nevi’im, Ketuvim)',
        reason:
          'The Hebrew text is available from Sefaria, but the public-domain JPS 1917 English edition was not exposed by the API in this environment. The Bible collection carries the same books with Hebrew originals.',
      },
      {
        id: 'talmud',
        title: 'Talmud',
        reason:
          'Sefaria’s English Talmud is CC BY-NC and very large; the public-domain Rodkinson edition covers only part of the Talmud and needs a dedicated import.',
      },
      {
        id: 'midrash',
        title: 'Midrash',
        reason:
          'No complete openly licensed English digital edition was verified for automatic import.',
      },
    ],
  },
  {
    religion: 'Jainism',
    books: [
      {
        id: 'tattvartha-sutra',
        title: 'Tattvartha Sutra',
        reason:
          'No openly licensed, machine-readable English edition could be verified during this build.',
      },
      {
        id: 'agamas',
        title: 'Agamas',
        reason:
          'The Agamas are largely untranslated into English in the public domain; no open digital edition was verified.',
      },
    ],
  },
  {
    religion: 'Zoroastrianism',
    books: [
      {
        id: 'avesta',
        title: 'Avesta',
        reason:
          'Darmesteter’s and Mills’s public-domain translations exist in the Sacred Books of the East, but the reachable copies were blocked and no structured edition was available.',
      },
    ],
  },
  {
    religion: 'Taoism',
    books: [
      { id: 'tao-te-ching' },
      {
        id: 'zhuangzi',
        title: 'Zhuangzi',
        reason:
          'Legge’s and Giles’s public-domain translations exist, but no clean chapter-segmented digital edition was reachable in this build.',
      },
    ],
  },
  { religion: 'Confucianism', books: [{ id: 'analects' }] },
  {
    religion: 'Shinto',
    books: [
      {
        id: 'kojiki',
        title: 'Kojiki',
        reason:
          'Chamberlain’s 1882 public-domain translation exists on Wikisource but needs a section-by-section import; not completed in this build.',
      },
      {
        id: 'nihon-shoki',
        title: 'Nihon Shoki',
        reason:
          'Aston’s 1896 public-domain translation exists but no clean machine-readable edition was reachable.',
      },
    ],
  },
  {
    religion: "Bahá'í",
    books: [
      {
        id: 'kitab-i-aqdas',
        title: "Kitáb-i-Aqdas",
        reason:
          'The official English translations are © Bahá’í World Centre and are not openly licensed for redistribution, so the text is not bundled.',
      },
    ],
  },
]

/**
 * Summaries live in the build cache, which a fresh checkout does not have.
 * The shard files carry the same book metadata, so rebuild from them first and
 * let cached summaries (which also record download sizes) take precedence.
 */
const summaries = new Map()
const shardFiles = (await fs.readdir(BOOKS).catch(() => [])).filter(
  (f) => f.endsWith('.json') && !f.endsWith('-chapters.json'),
)
for (const file of shardFiles) {
  const json = JSON.parse(await fs.readFile(path.join(BOOKS, file), 'utf8'))
  const meta = json.book || {}
  if (!meta.id) continue
  const entry = summaries.get(meta.id) || {
    ...meta,
    verseCount: 0,
    chapterCount: 0,
    files: [],
    chaptersFile: `data/books/${meta.id}-chapters.json`,
    autoTranslit: 0,
    bytes: 0,
  }
  entry.verseCount += json.chapters.reduce((n, c) => n + c.verses.length, 0)
  entry.chapterCount += json.chapters.length
  entry.bytes += (await fs.stat(path.join(BOOKS, file))).size
  entry.files.push({ path: `data/books/${file}`, chapters: json.chapters.map((c) => c.number) })
  for (const chapter of json.chapters) {
    for (const verse of chapter.verses) if (verse.autoTranslit) entry.autoTranslit++
  }
  summaries.set(meta.id, entry)
}

const summaryFiles = await fs.readdir(SUMMARIES).catch(() => [])
for (const file of summaryFiles.filter((f) => f.endsWith('.json'))) {
  const summary = JSON.parse(await fs.readFile(path.join(SUMMARIES, file), 'utf8'))
  summaries.set(summary.id, { ...summaries.get(summary.id), ...summary })
}

const religions = []
const books = []
let totalVerses = 0
let bundledBooks = 0

for (const group of CATALOG) {
  const entries = group.books.map((entry) => {
    const summary = summaries.get(entry.id)
    if (summary && summary.verseCount > 0) {
      bundledBooks++
      totalVerses += summary.verseCount
      const meta = {
        ...summary,
        status: 'bundled',
        religion: group.religion,
      }
      books.push(meta)
      return meta
    }
    const meta = {
      id: entry.id,
      title: entry.title || entry.id,
      religion: group.religion,
      status: 'unavailable',
      reason: entry.reason || 'No openly licensed edition was verified for this build.',
    }
    books.push(meta)
    return meta
  })
  religions.push({
    id: group.religion.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: group.religion,
    books: entries,
    verseCount: entries.reduce((n, b) => n + (b.verseCount || 0), 0),
  })
}

const registry = {
  generated: new Date().toISOString(),
  stats: { books: books.length, bundledBooks, verses: totalVerses },
  religions,
  books,
}
await fs.writeFile(path.join(DATA, 'registry.json'), JSON.stringify(registry, null, 2))

// Keep a served copy of the editable theme map.
await fs.copyFile(path.join(ROOT, 'data', 'synonyms.json'), path.join(DATA, 'synonyms.json'))

// Verse-of-the-day rotation: deterministic, drawn from the bundled corpus.
const tag = (await loadThemes(), null)
void tag
const themes = ['love', 'peace', 'hope', 'wisdom', 'compassion', 'patience', 'justice', 'mercy']
const votd = []
for (const meta of books.filter((b) => b.status === 'bundled')) {
  let picked = 0
  for (const file of meta.files || []) {
    if (picked >= 4) break
    const json = JSON.parse(await fs.readFile(path.join(ROOT, 'public', file.path), 'utf8'))
    for (const chapter of json.chapters) {
      for (const verse of chapter.verses) {
        if (picked >= 4) break
        const tags = verse.tags || []
        if (tags.some((t) => themes.includes(t)) && verse.original && verse.translation.length < 420) {
          votd.push({ ...verse, bookId: meta.id, script: meta.script })
          picked++
        }
      }
      if (picked >= 4) break
    }
  }
}
await fs.writeFile(path.join(DATA, 'votd.json'), JSON.stringify(votd))

console.log(
  `  ✓ registry: ${bundledBooks} bundled collections, ${books.length} catalogue entries, ${totalVerses.toLocaleString()} verses`,
)
console.log(`  ✓ verse of the day: ${votd.length} entries`)
