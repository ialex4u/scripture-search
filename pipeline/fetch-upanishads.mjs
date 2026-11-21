/**
 * The Upanishads — Friedrich Max Müller's public-domain translations from the
 * Sacred Books of the East (vol. I, 1879, and vol. XV, 1884), transcribed and
 * proofread on Wikisource. Seven of the principal Upanishads are included;
 * Brihadâranyaka, Svetâsvatara and Maitrâyana are listed in the registry as not
 * bundled, with the reason given there.
 *
 * Müller prints the Aitareya Upanishad inside his translation of the whole
 * Aitareya-âranyaka, so that one is cut out of the longer ritual text: the
 * Upanishad is the second âranyaka, adhyâyas 4–6, which ends with “Thus it
 * is, Om.”
 *
 * Run: npm run data:upanishads
 */
import * as cheerio from 'cheerio'
import {
  pageHtml,
  blockText,
  isHeading,
  writeBook,
  loadThemes,
  makeTagger,
  clean,
  wikiPages,
  plainWiki,
} from './lib.mjs'

const VOL1 = 'Sacred Books of the East/Volume 1'
const VOL15 = 'Sacred Books of the East/Volume 15'

const TEXTS = [
  ...['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'].map((ordinal, i) => ({
    name: 'Chandogya Upanishad',
    page: `${VOL1}/Khândogya-upanishad/${ordinal} Prapâthaka`,
    section: `Prapâthaka ${i + 1}`,
    order: 1,
  })),
  {
    name: 'Kena Upanishad',
    page: `${VOL1}/Talavakâra-upanishad`,
    section: '',
    order: 2,
    khandaIsChapter: true,
  },
  { name: 'Katha Upanishad', page: `${VOL15}/Katha-upanishad`, section: '', order: 3 },
  { name: 'Mundaka Upanishad', page: `${VOL15}/Mundaka-upanishad`, section: '', order: 4 },
  { name: 'Prasna Upanishad', page: `${VOL15}/Prasña-upanishad`, section: '', order: 5 },
  { name: 'Taittiriya Upanishad', page: 'Taittiriya Upanishad', section: '', order: 6 },
  {
    name: 'Aitareya Upanishad',
    page: `${VOL1}/Aitareya-âranyaka`,
    section: '',
    order: 7,
    adhyayaIsChapter: true,
    slice: { after: 'SECOND ARANYAKA', from: 'FOURTH ADHYAYA', to: 'SEVENTH ADHYAYA' },
  },
]

const ADHYAYA = /ADHY[ÂA]YA/i
const KHANDA = /KHA[ṆN]?[ḌD]A/i
const SECTION = /(VALL[ÎI]|PRAP[ÂA]THAKA|MUNDAKA)|^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH)\s+QUESTION/i
const MINOR = /(ANUV[ÂA]KA|BR[ÂA]HMA[ṆN]A)/i
const TITLE = /^[A-ZÂÊÎÔÛ'’\-\s]+UPANISHAD\.?$/i

function titleCase(s) {
  const map = {
    khanda: 'Khaṇḍa',
    khaṇḍa: 'Khaṇḍa',
    valli: 'Vallî',
    vallî: 'Vallî',
    adhyaya: 'Adhyâya',
    adhyâya: 'Adhyâya',
    prapathaka: 'Prapâthaka',
    prapâthaka: 'Prapâthaka',
    anuvaka: 'Anuvâka',
    anuvâka: 'Anuvâka',
    brahmana: 'Brâhmaṇa',
    brâhmaṇa: 'Brâhmaṇa',
    mundaka: 'Mundaka',
    question: 'Question',
    first: 'First',
    second: 'Second',
    third: 'Third',
    fourth: 'Fourth',
    fifth: 'Fifth',
    sixth: 'Sixth',
    seventh: 'Seventh',
    eighth: 'Eighth',
    ninth: 'Ninth',
    tenth: 'Tenth',
    eleventh: 'Eleventh',
    twelfth: 'Twelfth',
    thirteenth: 'Thirteenth',
    fourteenth: 'Fourteenth',
    fifteenth: 'Fifteenth',
    sixteenth: 'Sixteenth',
  }
  return s
    .replace(/\.$/, '')
    .split(/\s+/)
    .map((word) => map[word.toLowerCase()] || word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

/** Split a rendered block into numbered paragraphs. */
function splitVerses(text) {
  const out = []
  let current = null
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const m = line.match(/^(\d{1,3})[.)]?\s+(.*)$/)
    if (m) {
      if (current) out.push(current)
      current = { number: Number(m[1]), text: m[2] }
    } else if (current) {
      current.text += ' ' + line
    } else {
      out.push({ number: null, text: line })
    }
  }
  if (current) out.push(current)
  return out.map((v) => ({ ...v, text: clean(v.text) })).filter((v) => v.text)
}

const HEADING = /^(={2,6})\s*(.+?)\s*\1\s*$/

/**
 * Cut a run of wikitext out of a larger page and return the block shape the
 * rendered-HTML path produces: one entry per heading and one per paragraph.
 * The slice begins at the heading matching `from`, having first passed the
 * heading matching `after`, and ends before the heading matching `to`.
 */
function wikitextBlocks(raw, { after, from, to }) {
  const blocks = []
  let para = []
  const flush = () => {
    if (para.length) blocks.push({ heading: false, body: para.join('\n') })
    para = []
  }
  let passed = false
  let started = false
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    const m = line.match(HEADING)
    const head = m ? plainWiki(m[2]).toUpperCase() : ''
    if (!passed) {
      if (head.includes(after)) passed = true
      continue
    }
    if (!started) {
      if (!head.includes(from)) continue
      started = true
    } else if (head.includes(to)) {
      break
    }
    if (m) {
      flush()
      blocks.push({ heading: true, body: plainWiki(m[2]) })
      continue
    }
    if (!line) {
      flush()
      continue
    }
    if (/^[:*#;]\s*/.test(line) && !para.length && blocks.length && !blocks.at(-1).heading) {
      // A colon-indented paragraph continues the one above it (Müller uses
      // this for the successive clauses of a single numbered verse).
      blocks[blocks.length - 1].body +=
        '\n' + plainWiki(line.replace(/^[:*#;]+\s*/, ''))
      continue
    }
    para.push(plainWiki(line))
  }
  flush()

  // Müller prints the continuation of a numbered verse as a further unnumbered
  // paragraph; keep those words with their verse instead of inventing numbers.
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1]
    const here = blocks[i]
    if (!here.heading && !prev.heading && !/^\d/.test(here.body) && /^\d/.test(prev.body)) {
      prev.body += '\n' + here.body
      blocks.splice(i, 1)
      i -= 1
    }
  }

  return blocks.filter((b) => b.body)
}

const tag = makeTagger(await loadThemes())
const chapters = []

for (const text of TEXTS) {
  console.log(`Upanishads: ${text.name}${text.section ? ` (${text.section})` : ''}…`)
  const blocks = []
  if (text.slice) {
    const page = (await wikiPages([text.page], { prefix: `slice-${text.order}` })).get(text.page)
    if (!page) throw new Error(`Could not fetch “${text.page}”`)
    blocks.push(...wikitextBlocks(page, text.slice))
  } else {
    const html = await pageHtml(text.page)
    const $ = cheerio.load(html)
    $(
      'style, script, link, .ws-noexport, sup.reference, .pagenum, .ws-pagenum, .ws-summary, .wst-auxtoc, .wst-flatlist, .reflist, table, .mw-editsection',
    ).remove()

    const root = $('.mw-parser-output').length ? $('.mw-parser-output') : $.root()
    root.find('p, h2, h3, h4, h5, div.ws-poem-stanza, dd').each((_, el) => {
      const node = $(el)
      if (node.closest('table').length) return
      if (node.find('p').length) return
      const body = blockText(el, $)
      if (!body) return
      // Page furniture and licence notices are not scripture.
      if (/^(layout \d+\s*)+$/i.test(body)) return
      if (/^(this work is a translation|this work was published|public domain|the text of this)/i.test(body)) return
      if (/^\(?\d+\)?\s*$/.test(body)) return
      const tagName = (el.tagName || '').toLowerCase()
      const heading = /^h[2-5]$/.test(tagName) || isHeading(body.split('\n')[0])
      blocks.push({ heading, body })
    })
  }

  let chapter = null
  let sectionNo = 0
  let partNo = 0
  let sectionInPart = 0
  let hasParts = false
  let minor = 0
  let seq = 0
  let pending = []

  const shortName = text.name.replace(/ Upanishad$/, '')
  const khandaIsChapter = Boolean(text.khandaIsChapter)

  const ORDINALS = [
    'First',
    'Second',
    'Third',
    'Fourth',
    'Fifth',
    'Sixth',
    'Seventh',
    'Eighth',
    'Ninth',
    'Tenth',
  ]

  const refFor = (number) => {
    const parts = []
    if (hasParts) parts.push(String(partNo))
    parts.push(String(hasParts ? sectionInPart : sectionNo))
    if (minor > 0) parts.push(String(minor))
    parts.push(String(number))
    return `${shortName} ${parts.join('.')}`
  }

  // Text printed before the first numbered verse (the Aitareya doxology)
  // belongs to the section as a whole, so it is cited by section only.
  const sectionRef = () => {
    const parts = []
    if (hasParts) parts.push(String(partNo))
    parts.push(String(hasParts ? sectionInPart : sectionNo))
    if (minor > 0) parts.push(String(minor))
    return `${shortName} ${parts.join('.')}`
  }

  const flushPending = () => {
    if (!pending.length || !chapter) {
      pending = []
      return
    }
    seq += 1
    const body = clean(pending.join(' '))
    chapter.verses.push({
      id: `upanishads-${chapter.number}-${seq}`,
      verse: seq,
      ref: refFor(seq),
      original: '',
      translit: '',
      translation: body,
      tags: tag(body),
    })
    pending = []
  }

  const startChapter = (label, number) => {
    flushPending()
    sectionNo = number || sectionNo + 1
    sectionInPart += 1
    minor = 0
    seq = 0
    chapter = {
      number: text.order * 1000 + sectionNo,
      title: `${text.name}${label ? ` · ${label}` : ''}`,
      verses: [],
    }
    chapters.push(chapter)
  }

  const ensureChapter = () => {
    if (chapter) return
    const m = text.section.match(/(\d+)$/)
    startChapter(text.section, m ? Number(m[1]) : undefined)
  }

  for (const block of blocks) {
    const firstLine = block.body.split('\n')[0].trim()

    if (block.heading) {
      if (TITLE.test(firstLine)) continue
      if (text.adhyayaIsChapter && ADHYAYA.test(firstLine)) {
        startChapter(`${ORDINALS[sectionNo] ?? String(sectionNo + 1)} Adhyâya`)
        continue
      }
      if (ADHYAYA.test(firstLine)) {
        hasParts = true
        partNo += 1
        sectionInPart = 0
        continue
      }
      if (SECTION.test(firstLine) || (khandaIsChapter && KHANDA.test(firstLine))) {
        // One fixed section per page (the Chandogya Prapâthakas) already
        // supplies its own label; the echoed heading adds nothing.
        if (text.section) {
          ensureChapter()
          continue
        }
        startChapter(titleCase(firstLine))
        continue
      }
      if (KHANDA.test(firstLine) || MINOR.test(firstLine)) {
        ensureChapter()
        flushPending()
        minor += 1
        continue
      }
      continue
    }

    ensureChapter()
    const parsed = splitVerses(block.body)
    // Some editions (Müller's typed Taittiriya) print no verse numbers at all,
    // so there every paragraph is a verse; where numbers exist they are the
    // verse boundaries and unnumbered text continues the previous verse.
    const numbered = parsed.some((v) => v.number != null)
    for (const verse of parsed) {
      if (verse.number == null && !numbered) {
        flushPending()
        seq += 1
        chapter.verses.push({
          id: `upanishads-${chapter.number}-${seq}`,
          verse: seq,
          ref: text.slice ? sectionRef() : refFor(seq),
          original: '',
          translit: '',
          translation: verse.text,
          tags: tag(verse.text),
        })
        continue
      }
      if (verse.number == null) {
        if (!chapter.verses.length) pending.push(verse.text)
        else chapter.verses[chapter.verses.length - 1].translation += ' ' + verse.text
        continue
      }
      flushPending()
      seq += 1
      chapter.verses.push({
        id: `upanishads-${chapter.number}-${seq}`,
        verse: seq,
        ref: refFor(verse.number),
        original: '',
        translit: '',
        translation: verse.text,
        tags: tag(verse.text),
      })
    }
  }
  flushPending()

  if (!chapters.some((c) => c.title.startsWith(text.name))) {
    console.warn(`  ! nothing parsed for ${text.name}`)
  }
}

const used = chapters
  .filter((c) => c.verses.length)
  .sort((a, b) => a.number - b.number)

if (!used.length) throw new Error('Could not parse the Upanishads')

await writeBook({
  id: 'upanishads',
  religion: 'Hinduism',
  book: 'The Upanishads',
  language: 'sa',
  script: 'devanagari',
  translationName: 'The Upanishads (Sacred Books of the East, vols. I and XV)',
  translator: 'Friedrich Max Müller (1879, 1884)',
  license:
    'Public domain translations (Müller, 1879 and 1884); proofread transcription from Wikisource.',
  sourceUrl: 'https://en.wikisource.org/wiki/Sacred_Books_of_the_East/Volume_1',
  coverage: 'selection',
  notes:
    'Seven of the principal Upanishads as Müller translated and numbered them: Chandogya, Kena (Talavakâra), Aitareya, Katha, Mundaka, Prasna and Taittiriya. The Aitareya is the Upanishad proper from Müller’s Aitareya-âranyaka (second âranyaka, adhyâyas 4–6), lifted out of the surrounding ritual text. The Sanskrit text is not part of this edition. Brihadâranyaka, Svetâsvatara and Maitrâyana are not bundled; see the registry for the reason.',
  chapters: used,
})

console.log(
  `  Upanishads: ${used.length} sections, ${used.reduce((n, c) => n + c.verses.length, 0)} paragraphs`,
)
