/**
 * Yoga Sutras of Patañjali — Charles Johnston's 1912 translation, "The Book of
 * the Spiritual Man", public domain and transcribed by Project Gutenberg
 * (eBook #2526). Each of the four books is a chapter; each sutra is one verse.
 *
 * Run: npm run data:yogasutras
 */
import { fetchText, writeBook, loadThemes, makeTagger, clean } from './lib.mjs'

const URL = 'https://gutenberg.pglaf.org/cache/epub/2526/pg2526.txt'

console.log('Yoga Sutras: downloading Johnston translation…')
const raw = await fetchText(URL, { key: 'yogasutras-johnston-pg2526' })

const text = raw
  .replace(/\r\n?/g, '\n')
  .replace(/\*\*\* ?(START|END) OF THE PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/g, '')

const BOOKS = {
  I: { title: 'Book I · On Union (Samâdhi Pâda)', name: 'Book I' },
  II: { title: 'Book II · On the Means of Union (Sâdhana Pâda)', name: 'Book II' },
  III: { title: 'Book III · On the Powers of Union (Vibhûti Pâda)', name: 'Book III' },
  IV: { title: 'Book IV · On Isolation (Kaivalya Pâda)', name: 'Book IV' },
}

const tag = makeTagger(await loadThemes())
const chapters = []

// Body sections start at a line that is exactly "BOOK I" (the contents list
// at the front also mentions the books, so only whole-line hits count and the
// last occurrences are the body).
const starts = [...text.matchAll(/^BOOK (I{1,3}V?|IV)\s*$/gm)].map((m) => ({
  book: m[1],
  index: m.index,
}))
const body = starts.slice(-4)

for (let i = 0; i < body.length; i++) {
  const { book, index } = body[i]
  const end = i + 1 < body.length ? body[i + 1].index : text.length
  let section = text.slice(index + `BOOK ${book}`.length, end)
  // The running commentary is not scripture; sutras are the numbered
  // paragraphs. Everything from "INTRODUCTION TO" onwards is skipped.
  section = section.split(/\nINTRODUCTION TO /)[0]

  const paragraphs = section
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const verses = []
  for (const para of paragraphs) {
    // Johnston numbers some sutras without a full stop (“5 The darkness…”).
    const m = para.match(/^(\d{1,3})[.)]?\s+(.*)$/)
    if (!m) continue
    const number = Number(m[1])
    const translation = clean(m[2])
    if (!translation) continue
    if (verses.some((v) => v.verse === number)) continue
    verses.push({
      id: `yogasutras-${BOOKS[book].name.replace(/\s+/g, '').toLowerCase()}-${number}`,
      verse: number,
      ref: `Yoga Sutras ${book}.${number}`,
      original: '',
      translit: '',
      translation,
      tags: tag(translation),
    })
  }

  if (!verses.length) {
    console.warn(`  ! no sutras found in ${book}`)
    continue
  }
  chapters.push({
    number: Object.keys(BOOKS).indexOf(book) + 1,
    title: BOOKS[book].title,
    verses,
  })
  console.log(`  ${book}: ${verses.length} sutras`)
}

if (!chapters.length) throw new Error('Could not parse the Yoga Sutras')

await writeBook({
  id: 'yogasutras',
  religion: 'Hinduism',
  book: 'Yoga Sutras',
  language: 'sa',
  script: 'devanagari',
  translationName: 'The Yoga Sutras of Patanjali: The Book of the Spiritual Man',
  translator: 'Charles Johnston (1912)',
  license:
    'Public domain translation (Johnston, 1912); transcribed by Project Gutenberg (eBook #2526).',
  sourceUrl: 'https://www.gutenberg.org/ebooks/2526',
  notes:
    'Each entry is one sutra as Johnston numbers it. The Sanskrit original is not included in this public-domain edition; Johnston’s interpretive wording is printed exactly as published.',
  chapters,
})
