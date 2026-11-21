/**
 * The Analects of Confucius — James Legge's 1861/1893 public-domain translation
 * (The Chinese Classics, vol. 1) from Wikisource, with the Chinese text printed
 * alongside it in the same edition.
 *
 * Run: npm run data:analects
 */
import { fetchJSON, writeBook, loadThemes, makeTagger, stripWiki, clean } from './lib.mjs'

const BASE_PAGE = 'The Chinese Classics/Volume 1/Confucian Analects'
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
const ROMAN_VALUE = Object.fromEntries(ROMAN.map((r, i) => [r, i + 1]))

async function wikitext(page, key) {
  const params = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'wikitext',
    format: 'json',
    formatversion: '2',
  })
  const json = await fetchJSON(`https://en.wikisource.org/w/api.php?${params}`, { key })
  return json.parse?.wikitext || ''
}

const tag = makeTagger(await loadThemes())
const chapters = []

for (let b = 1; b <= 20; b++) {
  const roman = ROMAN[b - 1]
  console.log(`Analects: Book ${roman}…`)
  const text = await wikitext(`${BASE_PAGE}/${roman}`, `analects-${roman}`)
  if (!text) continue

  // Chinese: one {{lang|zh|…}} block per numbered chapter of the book.
  const chinese = [...text.matchAll(/\{\{lang\|zh\|([\s\S]*?)\}\}/gi)].map((m) =>
    clean(m[1].replace(/【[^】]*】/g, ' ')),
  )

  // English: "{{sc|Chapter}} I. …" up to the next chapter marker.
  const english = []
  const re = /\{\{sc\|Chapter\}\}\s*([IVXL]+)\.([\s\S]*?)(?=\{\{sc\|Chapter\}\}\s*[IVXL]+\.|$)/gi
  let m
  while ((m = re.exec(text))) {
    const body = stripWiki(m[2]).replace(/\s+/g, ' ').trim()
    if (body) english.push({ roman: m[1].toUpperCase(), body })
  }

  const used = new Set()
  english.forEach((ch, i) => {
    let verseNo = ROMAN_VALUE[ch.roman] || i + 1
    // A few pages repeat a chapter marker in running text; keep one entry each.
    while (used.has(verseNo)) verseNo += 100
    used.add(verseNo)
    chapters.push({
      number: b * 100 + verseNo,
      title: `Book ${roman} · Chapter ${ch.roman}`,
      verses: [
        {
          id: `analects-${b}-${verseNo}`,
          verse: verseNo,
          ref: `Analects ${b}.${verseNo}`,
          original: chinese[i] || '',
          translit: '',
          translation: ch.body,
          tags: tag(ch.body),
        },
      ],
    })
  })
}

if (!chapters.length) throw new Error('Could not parse the Analects from Wikisource')

await writeBook({
  id: 'analects',
  religion: 'Confucianism',
  book: 'The Analects',
  language: 'zh',
  script: 'han',
  translationName: 'The Chinese Classics, Vol. I: Confucian Analects',
  translator: 'James Legge (1893)',
  license: 'Public domain translation (Legge, 1893); classical Chinese text public domain.',
  sourceUrl: 'https://en.wikisource.org/wiki/The_Chinese_Classics/Volume_1/Confucian_Analects',
  notes:
    'Each entry is one numbered chapter of a Book, with Legge’s English and the Chinese text as printed in the same edition.',
  chapters,
})
