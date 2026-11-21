/**
 * Sri Guru Granth Sahib — all 1,430 Angs with Gurmukhi, Latin transliteration
 * and the BaniDB English rendering, from the open BaniDB API.
 *
 * Run:        npm run data:guru-granth-sahib
 * Partial:    node pipeline/fetch-guru-granth.mjs 1 100
 */
import { fetchJSON, writeBook, loadThemes, makeTagger, mapLimit } from './lib.mjs'

const API = 'https://api.banidb.com/v2/angs'
const from = Number(process.argv[2] || 1)
const to = Number(process.argv[3] || 1430)

console.log(`Guru Granth Sahib: downloading Angs ${from}–${to}…`)
const angNumbers = Array.from({ length: to - from + 1 }, (_, i) => from + i)

const pages = await mapLimit(angNumbers, 8, async (ang) =>
  fetchJSON(`${API}/${ang}`, { key: `banidb-ang-${ang}` }),
)

const tag = makeTagger(await loadThemes())
const chapters = []

for (let i = 0; i < pages.length; i++) {
  const page = pages[i]
  if (!page?.page?.length) continue
  const ang = angNumbers[i]
  const verses = []
  for (const line of page.page) {
    const original = line.verse?.unicode || line.verse?.gurmukhi || ''
    const translit = line.transliteration?.english || line.transliteration?.en || ''
    const translation = line.translation?.en?.bdb || line.translation?.en?.ms || ''
    if (!translation || !original) continue
    const lineNo = line.lineNo ?? verses.length + 1
    verses.push({
      id: `guru-granth-sahib-${ang}-${lineNo}-${verses.length}`,
      verse: lineNo,
      ref: `Guru Granth Sahib, Ang ${ang}`,
      original,
      translit,
      translation: translation.replace(/\s+/g, ' ').trim(),
      tags: tag(translation),
    })
  }
  if (verses.length) {
    chapters.push({ number: ang, title: `Ang ${ang}`, verses })
  }
}

await writeBook({
  id: 'guru-granth-sahib',
  religion: 'Sikhism',
  book: 'Sri Guru Granth Sahib',
  language: 'pa',
  script: 'gurmukhi',
  translationName: 'BaniDB English rendering',
  translator: 'BaniDB / Shabad OS contributors',
  license:
    'BaniDB open data (Shabad OS). Gurmukhi text is scripture; the English rendering is the BaniDB edition — see SOURCES.md for its terms.',
  sourceUrl: 'https://banidb.com/',
  coverage: from === 1 && to === 1430 ? 'complete' : `partial (Angs ${from}–${to})`,
  chapters,
  maxVersesPerShard: 2600,
})
