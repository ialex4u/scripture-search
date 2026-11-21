/**
 * Hadith — Sahih al-Bukhari, Sahih Muslim, Sunan Abu Dawud, Jami' at-Tirmidhi,
 * Sunan an-Nasa'i and Sunan Ibn Majah, Arabic + English, from the open
 * fawazahmed0/hadith-api dataset (https://github.com/fawazahmed0/hadith-api).
 *
 * Run:    npm run data:hadith
 * Subset: node pipeline/fetch-hadith.mjs bukhari muslim
 */
import { fetchJSON, writeBook, loadThemes, makeTagger, autoTransliterate } from './lib.mjs'

const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'

const COLLECTIONS = {
  bukhari: {
    title: 'Sahih al-Bukhari',
    english: 'Sahih al-Bukhari',
    translator: 'Muhammad Muhsin Khan (as distributed in the open hadith-api dataset)',
  },
  muslim: {
    title: 'Sahih Muslim',
    english: 'Sahih Muslim',
    translator: "Abdul Hamid Siddiqui (as distributed in the open hadith-api dataset)",
  },
  abudawud: {
    title: 'Sunan Abu Dawud',
    english: 'Sunan Abu Dawud',
    translator: 'Open hadith-api dataset edition',
  },
  tirmidhi: {
    title: "Jami' at-Tirmidhi",
    english: "Jami' at-Tirmidhi",
    translator: 'Open hadith-api dataset edition',
  },
  nasai: {
    title: "Sunan an-Nasa'i",
    english: "Sunan an-Nasa'i",
    translator: 'Open hadith-api dataset edition',
  },
  ibnmajah: {
    title: 'Sunan Ibn Majah',
    english: 'Sunan Ibn Majah',
    translator: 'Open hadith-api dataset edition',
  },
}

const requested = process.argv.slice(2).filter((a) => COLLECTIONS[a])
const ids = requested.length ? requested : Object.keys(COLLECTIONS)
const tag = makeTagger(await loadThemes())

for (const key of ids) {
  const meta = COLLECTIONS[key]
  console.log(`Hadith: ${meta.title}…`)
  const [eng, ara] = await Promise.all([
    fetchJSON(`${BASE}/eng-${key}.json`, { key: `hadith-eng-${key}` }),
    fetchJSON(`${BASE}/ara-${key}.json`, { key: `hadith-ara-${key}` }),
  ])
  const arabicByNumber = new Map(ara.hadiths.map((h) => [h.hadithnumber, h.text]))
  const sections = eng.metadata?.sections || {}

  const chaptersMap = new Map()
  for (const h of eng.hadiths) {
    const bookNo = h.reference?.book ?? 0
    const title = sections[String(bookNo)] || `Book ${bookNo}`
    const number = bookNo || 1
    if (!chaptersMap.has(number)) {
      chaptersMap.set(number, { number, title: `Book ${bookNo} — ${title}`.trim(), verses: [] })
    }
    const original = arabicByNumber.get(h.hadithnumber) || ''
    const translation = h.text.replace(/\s+/g, ' ').trim()
    const translit = autoTransliterate(original, 'ar')
    chaptersMap.get(number).verses.push({
      id: `${key}-${h.hadithnumber}`,
      verse: h.hadithnumber,
      ref: `${meta.english} ${h.hadithnumber}`,
      original,
      translit,
      autoTranslit: Boolean(translit),
      translation,
      tags: tag(translation),
    })
  }

  const chapters = [...chaptersMap.values()]
    .filter((c) => c.verses.length)
    .sort((a, b) => a.number - b.number)

  await writeBook({
    id: key,
    religion: 'Islam',
    book: meta.title,
    language: 'ar',
    script: 'arabic',
    translationName: meta.english,
    translator: meta.translator,
    license:
      'Dataset: fawazahmed0/hadith-api (public open-source dataset). Arabic hadith text is classical and in the public domain; English wording is distributed by that dataset — verify publisher terms before commercial reuse.',
    sourceUrl: 'https://github.com/fawazahmed0/hadith-api',
    notes: 'Transliteration generated automatically from the Arabic (flagged per verse).',
    chapters,
    maxVersesPerShard: 2600,
  })
}
