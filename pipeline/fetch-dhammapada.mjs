/**
 * Dhammapada — Max Müller's 1881 public-domain translation (Sacred Books of the
 * East vol. X) from Wikisource, with the Pali verses attached when the
 * SuttaCentral sc-data files can be located.
 *
 * Run: npm run data:dhammapada
 */
import {
  fetchText,
  fetchJSON,
  writeBook,
  loadThemes,
  makeTagger,
  stripWiki,
  autoTransliterate,
} from './lib.mjs'

const PAGE = 'Dhammapada (Muller)'
const WIKI = 'https://en.wikisource.org/w/api.php'

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI']
const ROMAN_VALUE = Object.fromEntries(ROMAN.map((r, i) => [r, i + 1]))

console.log('Dhammapada: downloading Müller translation from Wikisource…')
const params = new URLSearchParams({
  action: 'parse',
  page: PAGE,
  prop: 'wikitext',
  format: 'json',
  formatversion: '2',
})
const page = await fetchJSON(`${WIKI}?${params}`, { key: 'dhammapada-muller' })
const wikitext = page.parse?.wikitext || ''

const verseRe = /\{\{verse\|chapter=([IVXL]+)\|verse=(\d+)\}\}([\s\S]*?)(?=\{\{verse\||\n==|$)/gi
const parsed = []
let m
while ((m = verseRe.exec(wikitext))) {
  const text = stripWiki(m[3])
  if (text) parsed.push({ chapter: m[1].toUpperCase(), verse: Number(m[2]), text })
}
if (!parsed.length) throw new Error('Could not parse Dhammapada verses from Wikisource')

/** Best-effort Pali originals from SuttaCentral sc-data (CC0). */
async function loadPali() {
  try {
    const tree = await fetchJSON(
      'https://api.github.com/repos/suttacentral/sc-data/git/trees/main?recursive=1',
      { key: 'sc-data-tree' },
    )
    const candidates = tree.tree
      .map((t) => t.path)
      .filter((p) => p.includes('/root/pli/') && /\/dhp\d+-\d+_root-pli-ms\.json$/.test(p))
    if (!candidates.length) return new Map()
    const map = new Map()
    for (const path of candidates) {
      const json = await fetchJSON(
        `https://raw.githubusercontent.com/suttacentral/sc-data/main/${path}`,
        { key: `pali-${path.replace(/\W/g, '_')}` },
      )
      for (const [key, value] of Object.entries(json)) {
        const mm = key.match(/^dhp(\d+):([\d.]+)$/)
        if (mm) map.set(Number(mm[1]), value)
      }
    }
    return map
  } catch (err) {
    console.warn(`  ! Pali originals unavailable: ${err.message}`)
    return new Map()
  }
}

const pali = await loadPali()
console.log(`  Pali originals found: ${pali.size}`)

const tag = makeTagger(await loadThemes())
const chaptersMap = new Map()
for (const v of parsed) {
  const chNo = ROMAN_VALUE[v.chapter] || 1
  if (!chaptersMap.has(chNo)) {
    chaptersMap.set(chNo, { number: chNo, title: `Chapter ${v.chapter}`, verses: [] })
  }
  const original = pali.get(v.verse) || ''
  const translit = original ? autoTransliterate(original, 'pi') : ''
  chaptersMap.get(chNo).verses.push({
    id: `dhammapada-${v.verse}`,
    verse: v.verse,
    ref: `Dhammapada ${v.verse}`,
    original,
    translit,
    translation: v.text,
    tags: tag(v.text),
  })
}

await writeBook({
  id: 'dhammapada',
  religion: 'Buddhism',
  book: 'Dhammapada',
  language: 'pi',
  script: 'latin',
  translationName: 'The Dhammapada (Sacred Books of the East, vol. X)',
  translator: 'Friedrich Max Müller (1881)',
  license:
    'Public domain translation (Müller, 1881). Pali root text: SuttaCentral sc-data, CC0.',
  sourceUrl: 'https://en.wikisource.org/wiki/Dhammapada_(Muller)',
  notes: pali.size
    ? 'Pali root text attached from SuttaCentral sc-data where the edition matches the verse.'
    : 'Pali root text could not be attached automatically; English translation is shown alone.',
  chapters: [...chaptersMap.values()].sort((a, b) => a.number - b.number).map((c) => ({
    ...c,
    verses: c.verses.sort((a, b) => a.verse - b.verse),
  })),
})
