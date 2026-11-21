/**
 * Qur'an — Arabic (Uthmani), Latin transliteration and the 1930 Pickthall
 * English translation, via the open alquran.cloud API (Tanzil / Quran.com data).
 *
 * Run: npm run data:quran
 */
import { fetchJSON, writeBook, loadThemes, makeTagger } from './lib.mjs'

const API = 'https://api.alquran.cloud/v1/quran'

console.log('Qur\'an: downloading Arabic, transliteration and Pickthall translation…')
const [arabic, latin, english] = await Promise.all([
  fetchJSON(`${API}/quran-uthmani`, { key: 'quran-uthmani' }),
  fetchJSON(`${API}/en.transliteration`, { key: 'quran-transliteration' }),
  fetchJSON(`${API}/en.pickthall`, { key: 'quran-pickthall' }),
])

const tag = makeTagger(await loadThemes())
const surahs = arabic.data.surahs
if (!surahs?.length) throw new Error('Unexpected Qur\'an API response')

const chapters = surahs.map((surah, si) => {
  const en = english.data.surahs[si]
  const tr = latin.data.surahs[si]
  return {
    number: surah.number,
    title: `${surah.englishName} · ${surah.name}`,
    verses: surah.ayahs.map((ayah, ai) => {
      const translation = en.ayahs[ai].text
      return {
        id: `quran-${surah.number}-${ayah.numberInSurah}`,
        verse: ayah.numberInSurah,
        ref: `Qur'an ${surah.number}:${ayah.numberInSurah}`,
        original: ayah.text,
        translit: tr.ayahs[ai].text,
        translation,
        tags: tag(translation),
      }
    }),
  }
})

await writeBook({
  id: 'quran',
  religion: 'Islam',
  book: "Qur'an",
  language: 'ar',
  script: 'arabic',
  translationName: 'The Meaning of the Glorious Koran',
  translator: 'Marmaduke Pickthall (1930)',
  license: 'Public domain translation (Pickthall, 1930). Arabic text: Tanzil.net / Quran.com open data (CC BY 3.0).',
  sourceUrl: 'https://alquran.cloud/api',
  chapters,
  maxVersesPerShard: 2600,
})
