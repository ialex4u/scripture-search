/**
 * Rig Veda — Ralph T. H. Griffith's 1896 translation, "The Hymns of the Rigveda,
 * translated with a popular commentary", public domain and transcribed on
 * Wikisource. Each Maṇḍala is a book, each hymn a chapter and each stanza a
 * verse, so “Rig Veda 1.1.1” is book 1, hymn 1, stanza 1.
 *
 * Hymns are fetched fifty at a time (the MediaWiki API limit) and cached, so a
 * rerun after an interruption only fetches what is still missing.
 *
 * Run: npm run data:rigveda
 */
import * as cheerio from 'cheerio'
import {
  wikiPages,
  pageHtml,
  blockText,
  plainWiki,
  writeBook,
  loadThemes,
  makeTagger,
  clean,
} from './lib.mjs'

const ROOT = 'The Hymns of the Rigveda'
const BOOKS = 10

console.log('Rig Veda: reading the book indexes…')
const indexTitles = Array.from({ length: BOOKS }, (_, i) => `${ROOT}/Book ${i + 1}`)
const indexes = await wikiPages(indexTitles, { prefix: 'rigveda-index' })

// The book indexes are not uniform (some list [[/Hymn 3]], others
// [[/Hymn 3|Hymn 3]]), so the table of contents gives the upper bound and the
// fetch itself decides which hymns exist.
const hymnNumbers = new Map()
for (let b = 1; b <= BOOKS; b++) {
  const wikitext = indexes.get(`${ROOT}/Book ${b}`) || ''
  const nums = [...wikitext.matchAll(/\[\[\/Hymn (\d+)[|\]]/g)].map((m) => Number(m[1]))
  const max = nums.length ? Math.max(...nums) : 120
  hymnNumbers.set(
    b,
    Array.from({ length: max }, (_, i) => i + 1),
  )
  console.log(`  Book ${b}: up to ${max} hymns`)
}

const titles = []
for (let b = 1; b <= BOOKS; b++) {
  for (const h of hymnNumbers.get(b)) titles.push(`${ROOT}/Book ${b}/Hymn ${h}`)
}
console.log(`Rig Veda: fetching ${titles.length} hymn pages…`)

const wikitexts = await wikiPages(titles, { prefix: 'rigveda-hymns-v2' })

/** Text of one hymn, from either typed wikitext or a rendered transclusion. */
async function hymnText(title) {
  const raw = wikitexts.get(title) || ''
  if (raw && !/<pages\b/i.test(raw)) {
    // Typed hymns wrap the stanzas in <div class="verse"><pre> or use <br />.
    const pre = raw.match(/<pre>([\s\S]*?)<\/pre>/i)
    let body = pre ? pre[1] : raw.replace(/^\{\{header[\s\S]*?\}\}/i, '')
    body = body
      .replace(/<ref[^>]*\/>/gi, ' ')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\{\{\s*(?:sc|smallcaps|l|xl|larger)\s*\|([^{}]*)\}\}/gi, '$1')
      .replace(/\{\{\s*gap\}\}/gi, ' ')
      .replace(/\{\{[^{}]*\}\}/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/'''?/g, '')
    return body
  }
  // A handful of hymns (mostly in Book 1) transclude scanned pages instead.
  const html = await pageHtml(title)
  const $ = cheerio.load(html)
  $('style, script, link, .ws-noexport, sup.reference, .pagenum, .ws-pagenum, .reflist, table').remove()
  const blocks = []
  $('.mw-parser-output')
    .find('p, div.ws-poem-stanza, div.verse, dd')
    .each((_, el) => {
      const node = $(el)
      if (node.find('p, div').length) return
      const text = blockText(el, $)
      if (text) blocks.push(text)
    })
  return blocks.join('\n')
}

/** Split Griffith's hymn text into stanzas, joining the wrapped lines. */
function parseHymn(body) {
  const verses = []
  let current = null
  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (/^(HYMN|BOOK|THE HYMNS|ARGUMENT|Footnotes?)/i.test(line)) continue
    // Editorial notes standing in for a hymn are not scripture.
    if (/^\(The following Hymn/i.test(line)) continue
    const m = line.match(/^(\d{1,3})[.)]?\s+(.*)$/)
    if (m) {
      if (current) verses.push(current)
      current = { number: Number(m[1]), text: m[2] }
    } else if (current) {
      current.text += ' ' + line
    } else if (line.length > 20) {
      // Griffith prints the opening stanza of many hymns without a number.
      current = { number: 1, text: line }
    }
  }
  if (current) verses.push(current)
  const cleaned = verses
    .map((v) => ({ number: v.number, text: clean(plainWiki(v.text)) }))
    .filter((v) => v.text && v.text.length > 3)
  // A stray number inside a stanza can repeat the printed numbering; fall back
  // to a straight running count so ids stay unique and citations stay ordered.
  const numbered = cleaned.every((v, i) => v.number === i + 1)
  return cleaned.map((v, i) => ({ number: numbered ? v.number : i + 1, text: v.text }))
}

const tag = makeTagger(await loadThemes())
const chapters = []
let missing = 0

for (let b = 1; b <= BOOKS; b++) {
  const hymns = hymnNumbers.get(b)
  let parsed = 0
  for (const h of hymns) {
    const title = `${ROOT}/Book ${b}/Hymn ${h}`
    if (!wikitexts.get(title)) continue // that hymn number does not exist
    let body = ''
    try {
      body = await hymnText(title)
    } catch (err) {
      console.warn(`  ! ${b}.${h}: ${err.message}`)
    }
    const stanzas = parseHymn(body)
    if (!stanzas.length) {
      missing++
      console.warn(`  ! no text for hymn ${b}.${h}`)
      continue
    }
    parsed++
    const chapterNumber = b * 1000 + h
    chapters.push({
      number: chapterNumber,
      title: `Maṇḍala ${b} · Hymn ${h}`,
      verses: stanzas.map((s, i) => ({
        id: `rigveda-${b}-${h}-${s.number || i + 1}`,
        verse: s.number || i + 1,
        ref: `Rig Veda ${b}.${h}.${s.number || i + 1}`,
        original: '',
        translit: '',
        translation: s.text,
        tags: tag(s.text),
      })),
    })
  }
  console.log(`  Book ${b}: ${parsed} hymns parsed`)
}

if (!chapters.length) throw new Error('Could not parse the Rig Veda from Wikisource')

await writeBook({
  id: 'rigveda',
  religion: 'Hinduism',
  book: 'Rig Veda',
  language: 'sa',
  script: 'devanagari',
  translationName: 'The Hymns of the Rigveda, translated with a popular commentary',
  translator: 'Ralph T. H. Griffith (2nd edition, 1896)',
  license:
    'Public domain translation (Griffith, 1896); transcription from Wikisource. Griffith’s commentary and notes are not included.',
  sourceUrl: 'https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda',
  notes:
    'Complete translation in Griffith’s arrangement: ten Maṇḍalas, one chapter per hymn, one verse per stanza. The Sanskrit text and Griffith’s commentary are not included. Hymn 1.179, which the 1896 edition prints only as an appendix note, is absent.',
  chapters,
})

if (missing) {
  console.warn(`  ! ${missing} hymn(s) had no text and were skipped`)
}
