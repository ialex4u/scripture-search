/**
 * Bhagavad Gita — 700 verses with Devanagari, IAST transliteration and English,
 * from the MIT-licensed AdiyogiArts/gita-json dataset (base.json + en.json),
 * which is itself derived from the open VedicScriptures project.
 *
 * Run: npm run data:gita
 */
import { fetchJSON, writeBook, loadThemes, makeTagger } from './lib.mjs'

const BASE = 'https://raw.githubusercontent.com/AdiyogiArts/gita-json/main'

console.log('Bhagavad Gita: downloading Sanskrit, IAST and English…')
const [base, en] = await Promise.all([
  fetchJSON(`${BASE}/base.json`, { key: 'gita-base' }),
  fetchJSON(`${BASE}/en.json`, { key: 'gita-en' }),
])

const tag = makeTagger(await loadThemes())
const chapters = new Map()

for (const [key, v] of Object.entries(base)) {
  const translation = en[key]?.translation
  if (!translation || !v.sanskrit) continue
  const ch = Number(v.chapter)
  if (!chapters.has(ch)) {
    chapters.set(ch, {
      number: ch,
      title: `${v.chapterNameTranslation || `Chapter ${ch}`} · ${v.chapterName || ''}`.trim(),
      verses: [],
    })
  }
  const text = translation.trim()
  chapters.get(ch).verses.push({
    id: `gita-${ch}-${v.verse}`,
    verse: Number(v.verse),
    ref: `Bhagavad Gita ${ch}.${v.verse}`,
    original: v.sanskrit.replace(/\s*\|\s*/g, ' | ').replace(/\s+/g, ' ').trim(),
    translit: v.transliteration.replace(/\s+/g, ' ').trim(),
    translation: text,
    tags: tag(text),
  })
}

const ordered = [...chapters.values()].sort((a, b) => a.number - b.number)
for (const c of ordered) c.verses.sort((a, b) => a.verse - b.verse)

await writeBook({
  id: 'gita',
  religion: 'Hinduism',
  book: 'Bhagavad Gita',
  language: 'sa',
  script: 'devanagari',
  translationName: 'Open English rendering (gita-json / VedicScriptures dataset)',
  translator: 'VedicScriptures contributors (MIT)',
  license:
    'Sanskrit text and IAST: public domain. English rendering and dataset: MIT licence (github.com/AdiyogiArts/gita-json).',
  sourceUrl: 'https://github.com/AdiyogiArts/gita-json',
  chapters: ordered,
  maxVersesPerShard: 2600,
})
