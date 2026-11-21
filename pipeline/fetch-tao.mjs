/**
 * Tao Te Ching — James Legge's 1891 public-domain translation (Sacred Books of
 * the East vol. 39) from Wikisource, paired with the classical Chinese text of
 * the Wang Bi edition from Chinese Wikisource.
 *
 * Run: npm run data:tao-te-ching
 */
import { fetchJSON, writeBook, loadThemes, makeTagger, stripWiki, clean } from './lib.mjs'

const EN_PAGE = 'Tâo Teh King'
const ZH_PAGE = '道德經 (王弼本)'

async function wikitext(host, page, key) {
  const params = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'wikitext',
    format: 'json',
    formatversion: '2',
  })
  const json = await fetchJSON(`https://${host}/w/api.php?${params}`, { key })
  return json.parse?.wikitext || ''
}

console.log('Tao Te Ching: downloading Legge translation…')
const en = await wikitext('en.wikisource.org', EN_PAGE, 'tao-en')

console.log('Tao Te Ching: downloading Chinese original (Wang Bi edition)…')
let zh = ''
try {
  zh = await wikitext('zh.wikisource.org', ZH_PAGE, 'tao-zh-wangbi')
} catch (err) {
  console.warn(`  ! Chinese original unavailable: ${err.message}`)
}

// English is split by ===1=== … ===81=== headings.
const sections = new Map()
const sectionRe = /===\s*(\d+)\s*===([\s\S]*?)(?=\n===\s*\d+\s*===|$)/g
let m
while ((m = sectionRe.exec(en))) {
  sections.set(Number(m[1]), stripWiki(m[2]).replace(/\s+/g, ' ').trim())
}

/** Parse Chinese numerals used in chapter headings (一 … 八十一). */
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
function cnNumber(s) {
  if (/^\d+$/.test(s)) return Number(s)
  if (s === '十') return 10
  if (s.startsWith('十')) return 10 + (CN[s[1]] || 0)
  if (s.includes('十')) {
    const [a, b] = s.split('十')
    return (CN[a] || 1) * 10 + (CN[b] || 0)
  }
  return CN[s] || 0
}

// Chapters look like "==一章==". Commentary lines start with ":" or "{{*|";
// only the scripture lines are kept, verbatim.
const zhSections = new Map()
const zhRe = /==\s*([一二三四五六七八九十]+)\s*章\s*==([\s\S]*?)(?=\n==\s*[一二三四五六七八九十]+\s*章\s*==|$)/g
let z
while ((z = zhRe.exec(zh))) {
  const n = cnNumber(z[1])
  const lines = z[2]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(':') && !line.startsWith('{{*'))
  const text = clean(lines.join('').replace(/\{\{[^{}]*\}\}/g, ''))
  if (n && text && !zhSections.has(n)) zhSections.set(n, text)
}

const tag = makeTagger(await loadThemes())
const chapters = []
for (let n = 1; n <= 81; n++) {
  const translation = sections.get(n)
  if (!translation) continue
  chapters.push({
    number: n,
    title: `Chapter ${n}`,
    verses: [
      {
        id: `tao-te-ching-${n}`,
        verse: 1,
        ref: `Tao Te Ching ${n}`,
        original: zhSections.get(n) || '',
        translit: '',
        translation,
        tags: tag(translation),
      },
    ],
  })
}

await writeBook({
  id: 'tao-te-ching',
  religion: 'Taoism',
  book: 'Tao Te Ching',
  language: 'zh',
  script: 'han',
  translationName: 'The Tâo Teh King (Sacred Books of the East, vol. 39)',
  translator: 'James Legge (1891)',
  license:
    'Public domain translation (Legge, 1891); classical Chinese text public domain (Wang Bi edition, Chinese Wikisource).',
  sourceUrl: 'https://en.wikisource.org/wiki/Tâo_Teh_King',
  notes:
    'Legge translates each chapter as continuous prose, so one entry is one chapter. Chinese text is the Wang Bi edition without commentary.',
  chapters,
})

console.log(`  Chinese chapters attached: ${zhSections.size}/81`)
