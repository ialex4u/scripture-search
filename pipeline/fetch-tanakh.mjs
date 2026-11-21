/**
 * Tanakh — Torah, Nevi'im and Ketuvim in Hebrew (Miqra according to the
 * Masorah, CC BY-SA) with the public-domain JPS 1917 English translation,
 * from the Sefaria API.
 *
 * Run:             npm run data:tanakh
 * Warm the cache:  node pipeline/fetch-tanakh.mjs --cache-only
 */
import {
  fetchJSON,
  writeBook,
  loadThemes,
  makeTagger,
  autoTransliterate,
  clean,
  slug,
} from './lib.mjs'

const BOOKS = [
  ['Genesis', 50, 'Torah'], ['Exodus', 40, 'Torah'], ['Leviticus', 27, 'Torah'],
  ['Numbers', 36, 'Torah'], ['Deuteronomy', 34, 'Torah'],
  ['Joshua', 24, 'Nevi’im'], ['Judges', 21, 'Nevi’im'], ['I Samuel', 31, 'Nevi’im'],
  ['II Samuel', 24, 'Nevi’im'], ['I Kings', 22, 'Nevi’im'], ['II Kings', 25, 'Nevi’im'],
  ['Isaiah', 66, 'Nevi’im'], ['Jeremiah', 52, 'Nevi’im'], ['Ezekiel', 48, 'Nevi’im'],
  ['Hosea', 14, 'Nevi’im'], ['Joel', 4, 'Nevi’im'], ['Amos', 9, 'Nevi’im'],
  ['Obadiah', 1, 'Nevi’im'], ['Jonah', 4, 'Nevi’im'], ['Micah', 7, 'Nevi’im'],
  ['Nahum', 3, 'Nevi’im'], ['Habakkuk', 3, 'Nevi’im'], ['Zephaniah', 3, 'Nevi’im'],
  ['Haggai', 2, 'Nevi’im'], ['Zechariah', 14, 'Nevi’im'], ['Malachi', 3, 'Nevi’im'],
  ['Psalms', 150, 'Ketuvim'], ['Proverbs', 31, 'Ketuvim'], ['Job', 42, 'Ketuvim'],
  ['Song of Songs', 8, 'Ketuvim'], ['Ruth', 4, 'Ketuvim'], ['Lamentations', 5, 'Ketuvim'],
  ['Ecclesiastes', 12, 'Ketuvim'], ['Esther', 10, 'Ketuvim'], ['Daniel', 12, 'Ketuvim'],
  ['Ezra', 10, 'Ketuvim'], ['Nehemiah', 13, 'Ketuvim'], ['I Chronicles', 29, 'Ketuvim'],
  ['II Chronicles', 36, 'Ketuvim'],
]

const CACHE_ONLY = process.argv.includes('--cache-only')
const VEN = 'The Holy Scriptures: A New Translation (JPS 1917)'
const VHE = 'Miqra according to the Masorah'

const tag = makeTagger(await loadThemes())
let canon = 0
let missing = 0
const chapters = []

for (const [name, chapterCount, section] of BOOKS) {
  canon++
  console.log(`Tanakh: ${name} (${section})…`)
  for (let ch = 1; ch <= chapterCount; ch++) {
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(name)}.${ch}?ven=${encodeURIComponent(VEN)}&vhe=${encodeURIComponent(VHE)}`
    let data
    try {
      data = await fetchJSON(url, { key: `sefaria-${slug(name)}-${ch}` })
    } catch (err) {
      console.warn(`  ! ${name} ${ch}: ${err.message}`)
      missing++
      continue
    }
    if (CACHE_ONLY) continue

    const he = Array.isArray(data.he) ? data.he : data.he ? [data.he] : []
    const en = Array.isArray(data.text) ? data.text : data.text ? [data.text] : []
    const length = Math.max(he.length, en.length)
    const verses = []
    for (let i = 0; i < length; i++) {
      const translation = clean(en[i] || '')
      if (!translation) continue
      const original = clean(he[i] || '')
      const translit = autoTransliterate(original, 'he')
      verses.push({
        id: `tanakh-${canon}-${ch}-${i + 1}`,
        verse: i + 1,
        ref: `${name.replace(/^I /, '1 ').replace(/^II /, '2 ')} ${ch}:${i + 1}`,
        original,
        translit,
        autoTranslit: Boolean(translit),
        translation,
        tags: tag(translation),
      })
    }
    if (verses.length) {
      chapters.push({
        number: canon * 1000 + ch,
        title: `${name} ${ch} · ${section}`,
        verses,
      })
    }
  }
}

if (CACHE_ONLY) {
  console.log(`Tanakh cache warmed; ${missing} chapters missing. Run again to write the book.`)
  process.exit(0)
}

if (!chapters.length) {
  console.error('No Tanakh chapters could be parsed. Warm the cache first, then rerun.')
  process.exit(1)
}

await writeBook({
  id: 'tanakh',
  religion: 'Judaism',
  book: 'Tanakh',
  language: 'he',
  script: 'hebrew',
  translationName: 'The Holy Scriptures: A New Translation (JPS 1917)',
  translator: 'Jewish Publication Society (1917)',
  license:
    'Hebrew: Miqra according to the Masorah via Sefaria, CC BY-SA. English: JPS 1917, public domain.',
  sourceUrl: 'https://www.sefaria.org',
  notes:
    'Torah, Nevi’im and Ketuvim in the Hebrew order. Hebrew verse numbering is retained; a few books (e.g. Joel) differ from Christian numbering.',
  chapters,
})

if (missing) console.warn(`  ! ${missing} chapters were missing from the API`)
