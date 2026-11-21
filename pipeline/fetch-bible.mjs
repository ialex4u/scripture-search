/**
 * Bible — King James Version (public domain, 1611) with the Hebrew Masoretic
 * text (openscriptures/morphhb) for the Old Testament and the SBL Greek New
 * Testament (Faithlife/SBLGNT) for the New Testament.
 *
 * Run: npm run data:bible
 */
import {
  fetchJSON,
  fetchText,
  writeBook,
  loadThemes,
  makeTagger,
  autoTransliterate,
  clean,
  verseId,
} from './lib.mjs'

const KJV_URL =
  'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json'
const MORPHHB = 'https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc'
const SBLGNT = 'https://raw.githubusercontent.com/Faithlife/SBLGNT/master/data/sblgnt/text'

// KJV book order -> morphhb file (Hebrew OT)
const HEBREW_FILES = {
  Genesis: 'Gen', Exodus: 'Exod', Leviticus: 'Lev', Numbers: 'Num', Deuteronomy: 'Deut',
  Joshua: 'Josh', Judges: 'Judg', Ruth: 'Ruth', '1 Samuel': '1Sam', '2 Samuel': '2Sam',
  '1 Kings': '1Kgs', '2 Kings': '2Kgs', '1 Chronicles': '1Chr', '2 Chronicles': '2Chr',
  Ezra: 'Ezra', Nehemiah: 'Neh', Esther: 'Esth', Job: 'Job', Psalms: 'Ps',
  Proverbs: 'Prov', Ecclesiastes: 'Eccl', 'Song of Solomon': 'Song', Isaiah: 'Isa',
  Jeremiah: 'Jer', Lamentations: 'Lam', Ezekiel: 'Ezek', Daniel: 'Dan', Hosea: 'Hos',
  Joel: 'Joel', Amos: 'Amos', Obadiah: 'Obad', Jonah: 'Jonah', Micah: 'Mic',
  Nahum: 'Nah', Habakkuk: 'Hab', Zephaniah: 'Zeph', Haggai: 'Hag', Zechariah: 'Zech',
  Malachi: 'Mal',
}

// KJV book -> SBLGNT file prefix
const GREEK_FILES = {
  Matthew: 'Matt', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts', Romans: 'Rom',
  '1 Corinthians': '1Cor', '2 Corinthians': '2Cor', Galatians: 'Gal', Ephesians: 'Eph',
  Philippians: 'Phil', Colossians: 'Col', '1 Thessalonians': '1Thess',
  '2 Thessalonians': '2Thess', '1 Timothy': '1Tim', '2 Timothy': '2Tim', Titus: 'Titus',
  Philemon: 'Phlm', Hebrews: 'Heb', James: 'Jas', '1 Peter': '1Pet', '2 Peter': '2Pet',
  '1 John': '1John', '2 John': '2John', '3 John': '3John', Jude: 'Jude', Revelation: 'Rev',
}

const tag = makeTagger(await loadThemes())

console.log('Bible: downloading KJV…')
const kjv = await fetchJSON(KJV_URL, { key: 'kjv-en' })

/** Hebrew: <verse id="Gen.1.1">…<w>…</w>…</verse> */
async function loadHebrew(bookName) {
  const file = HEBREW_FILES[bookName]
  if (!file) return new Map()
  try {
    const xml = await fetchText(`${MORPHHB}/${file}.xml`, { key: `morphhb-${file}` })
    const map = new Map()
    const verseRe = /<verse[^>]*osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g
    let m
    while ((m = verseRe.exec(xml))) {
      const [, id, body] = m
      const [chapter, verse] = id.split('.').slice(1)
      const words = [...body.matchAll(/<w[^>]*>([\s\S]*?)<\/w>/g)].map((w) => clean(w[1]))
      if (words.length) map.set(`${Number(chapter)}:${Number(verse)}`, words.join(' '))
    }
    return map
  } catch (err) {
    console.warn(`  ! Hebrew ${bookName}: ${err.message}`)
    return new Map()
  }
}

/** Greek: lines shaped "Matt 1:1\tΒίβλος γενέσεως …" */
async function loadGreek(bookName) {
  const file = GREEK_FILES[bookName]
  if (!file) return new Map()
  try {
    const txt = await fetchText(`${SBLGNT}/${file}.txt`, { key: `sblgnt-${file}` })
    const map = new Map()
    for (const line of txt.split('\n')) {
      const m = line.match(/^[1-3]?\s?[A-Za-z]+\s(\d+):(\d+)\t(.+)$/)
      if (m) map.set(`${Number(m[1])}:${Number(m[2])}`, m[3].trim())
    }
    return map
  } catch (err) {
    console.warn(`  ! Greek ${bookName}: ${err.message}`)
    return new Map()
  }
}

const chapters = []
let canon = 0
let withOriginal = 0
let autoCount = 0

for (const book of kjv) {
  canon++
  const isOT = Boolean(HEBREW_FILES[book.name])
  const isNT = Boolean(GREEK_FILES[book.name])
  const originals = isOT ? await loadHebrew(book.name) : isNT ? await loadGreek(book.name) : new Map()
  console.log(`  · ${book.name} (${isOT ? 'Hebrew' : isNT ? 'Greek' : 'no original'} )`)

  book.chapters.forEach((verses, ci) => {
    const chapterNo = ci + 1
    chapters.push({
      number: canon * 1000 + chapterNo,
      title: `${book.name} ${chapterNo}`,
      verses: verses.map((translation, vi) => {
        const verseNo = vi + 1
        const original = originals.get(`${chapterNo}:${verseNo}`) || ''
        const translit = autoTransliterate(original, isOT ? 'he' : 'el')
        if (original) withOriginal++
        if (translit) autoCount++
        const text = translation.trim()
        return {
          id: verseId('bible', canon, chapterNo) + `-${verseNo}`,
          verse: verseNo,
          ref: `${book.name} ${chapterNo}:${verseNo}`,
          original,
          translit,
          autoTranslit: Boolean(translit),
          translation: text,
          tags: tag(text),
        }
      }),
    })
  })
}

await writeBook({
  id: 'bible',
  religion: 'Christianity',
  book: 'Bible',
  language: 'en',
  script: 'latin',
  translationName: 'King James Version (Authorized Version, 1611)',
  translator: 'King James Version translators',
  license:
    'KJV: public domain. Hebrew: Miqra according to the Masorah via openscriptures/morphhb (CC BY 4.0). Greek: SBL Greek New Testament (CC BY-SA 4.0).',
  sourceUrl:
    'https://github.com/thiagobodruk/bible · https://github.com/openscriptures/morphhb · https://github.com/Faithlife/SBLGNT',
  notes:
    'Old Testament original is the Hebrew Masoretic text; New Testament original is the SBL Greek text. Transliteration is automatic and flagged. Hebrew verse numbering can differ from KJV numbering in a few psalms.',
  chapters,
  maxVersesPerShard: 2800,
})

console.log(`  = ${withOriginal} verses with original-language text, ${autoCount} auto-transliterated`)
