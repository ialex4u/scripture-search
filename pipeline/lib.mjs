import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { transliterate } from 'transliteration'

export const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
export const CACHE = path.join(ROOT, 'pipeline', '.cache')
export const DATA = path.join(ROOT, 'public', 'data')
export const BOOKS = path.join(DATA, 'books')
export const SUMMARIES = path.join(CACHE, 'summaries')

const UA =
  'ScriptureSearch/1.0 (free open-source scripture PWA; data build script; https://github.com/)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function ensureDirs() {
  for (const d of [CACHE, DATA, BOOKS, SUMMARIES]) await fs.mkdir(d, { recursive: true })
}

/** Fetch with an on-disk cache so reruns of the pipeline are cheap and resumable. */
export async function fetchText(url, { key, headers = {}, retries = 3 } = {}) {
  await ensureDirs()
  const cacheDir = path.join(CACHE, 'http')
  await fs.mkdir(cacheDir, { recursive: true })
  const cacheKey = key || crypto.createHash('sha1').update(url).digest('hex')
  const file = path.join(cacheDir, cacheKey.replace(/[^a-zA-Z0-9._-]/g, '_'))
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    /* not cached yet */
  }
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: '*/*', ...headers },
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      const text = await res.text()
      await fs.writeFile(file, text)
      return text
    } catch (err) {
      lastErr = err
      await sleep(500 * attempt)
    }
  }
  throw lastErr
}

export async function fetchJSON(url, opts) {
  return JSON.parse(await fetchText(url, opts))
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  let failed = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = await fn(items[i], i)
      } catch (err) {
        failed++
        console.warn(`  ! failed item ${i}: ${err.message}`)
        results[i] = null
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  if (failed) console.warn(`  ! ${failed}/${items.length} items failed`)
  return results
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
}

/** Strip markup and normalise whitespace without touching the wording itself. */
export function clean(raw) {
  if (raw == null) return ''
  return String(raw)
    .replace(/<sup[\s\S]*?<\/sup>/gi, '')
    .replace(/<i[\s\S]*?<\/i>/gi, '')
    .replace(/<b[\s\S]*?<\/b>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m)
    .replace(/\[[0-9]{1,3}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripWiki(raw) {
  if (raw == null) return ''
  return clean(
    String(raw)
      .replace(/\{\{lang\|[a-z-]+\|([\s\S]*?)\}\}/gi, '$1')
      .replace(/\{\{verse\|[^}]*\}\}/gi, '')
      .replace(/\{\{[^{}]*\}\}/gi, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/'''?/g, '')
      .replace(/<\/?br\s*\/?>/gi, ' '),
  )
}

/** Transliterate a script into Latin letters, flagged in the data as automatic. */
const TRANSLIT_LANGS = { el: 'el', hi: 'hi', sa: 'hi', pi: '' }

const ARABIC = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': "'", 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
  'ة': 'a', 'ء': "'", 'ؤ': 'u', 'ئ': 'i', 'لا': 'la',
  'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ْ': '', 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in',
  'ّ': '', 'ـ': '', '،': ', ',
}
function transliterateArabic(text) {
  let out = ''
  for (const ch of text) {
    if (ch === 'ّ') {
      // shadda doubles the previous consonant
      out += out.at(-1) ?? ''
      continue
    }
    out += ARABIC[ch] ?? ch
  }
  return out.replace(/\s+/g, ' ').trim()
}

// A small, predictable Hebrew romaniser: letters are mapped, niqqud and
// cantillation are dropped, and the result is marked auto-transliterated.
const HEBREW = {
  'א': "'", 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch',
  'ט': 't', 'י': 'y', 'כ': 'kh', 'ך': 'kh', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n',
  'ן': 'n', 'ס': 's', 'ע': "'", 'פ': 'p', 'ף': 'f', 'צ': 'ts', 'ץ': 'ts', 'ק': 'q',
  'ר': 'r', 'ש': 'sh', 'ת': 't',
}
function transliterateHebrew(text) {
  return text
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\//g, '')
    .split('')
    .map((ch) => HEBREW[ch] ?? ch)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export function autoTransliterate(text, lang) {
  if (!text) return ''
  if (lang === 'he') return transliterateHebrew(text)
  if (lang === 'ar') return transliterateArabic(text)
  const code = TRANSLIT_LANGS[lang]
  if (!code) return ''
  try {
    return transliterate(text, { trim: true })
  } catch {
    return ''
  }
}

/** Load the editable theme map and build a fast tagger. */
export async function loadThemes() {
  const raw = await fs.readFile(path.join(ROOT, 'data', 'synonyms.json'), 'utf8')
  return JSON.parse(raw)
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function makeTagger(themes) {
  const compiled = Object.entries(themes)
    .filter(([theme]) => !theme.startsWith('_'))
    .map(([theme, words]) => ({
      theme,
      re: new RegExp(`\\b(${[...new Set([theme, ...words])].map(escapeRe).join('|')})`, 'i'),
    }))
  return (text, limit = 6) => {
    if (!text) return []
    const found = []
    for (const { theme, re } of compiled) {
      if (re.test(text)) found.push(theme)
      if (found.length >= limit) break
    }
    return found
  }
}

/** Split chapters into shards so a phone never downloads a whole canon at once. */
export function shardChapters(chapters, maxVerses = 2600) {
  const shards = []
  let current = []
  let count = 0
  for (const ch of chapters) {
    const size = ch.verses.length
    if (current.length && count + size > maxVerses) {
      shards.push(current)
      current = []
      count = 0
    }
    current.push(ch)
    count += size
  }
  if (current.length) shards.push(current)
  return shards
}

/**
 * Write one collection as lazily-loaded JSON shards plus a summary used by the
 * registry builder. Verses keep the exact shape documented in the README.
 */
export async function writeBook({
  id,
  religion,
  book,
  language,
  script,
  translationName,
  translator,
  license,
  sourceUrl,
  coverage = 'complete',
  notes = '',
  chapters,
  maxVersesPerShard = 2600,
  extra = {},
}) {
  await ensureDirs()
  const shards = shardChapters(chapters, maxVersesPerShard)
  const files = []
  let verseCount = 0
  let autoTranslit = 0

  for (let i = 0; i < shards.length; i++) {
    const outChapters = shards[i].map((ch) => ({
      number: ch.number,
      title: ch.title || '',
      verses: ch.verses.map((v) => {
        verseCount++
        if (v.autoTranslit) autoTranslit++
        return {
          id: v.id,
          religion,
          book,
          chapter: ch.number,
          chapterTitle: ch.title || undefined,
          verse: v.verse,
          ref: v.ref,
          original: v.original || '',
          translit: v.translit || '',
          autoTranslit: v.autoTranslit || undefined,
          translation: v.translation,
          translationName,
          translator,
          tags: v.tags || [],
        }
      }),
    }))
    const fileName = shards.length === 1 ? `${id}.json` : `${id}-${i + 1}.json`
    const payload = {
      book: {
        id,
        religion,
        title: book,
        language,
        script,
        translationName,
        translator,
        license,
        sourceUrl,
        coverage,
        notes,
        shard: shards.length > 1 ? `${i + 1}/${shards.length}` : undefined,
        ...extra,
      },
      chapters: outChapters,
    }
    await fs.writeFile(path.join(BOOKS, fileName), JSON.stringify(payload))
    files.push({
      path: `data/books/${fileName}`,
      chapters: outChapters.map((c) => c.number),
      firstChapter: outChapters[0]?.number,
      lastChapter: outChapters[outChapters.length - 1]?.number,
    })
  }

  // Lightweight chapter index so Browse and the reader can navigate without
  // downloading the verse text for the whole collection.
  const chaptersFile = `data/books/${id}-chapters.json`
  await fs.writeFile(
    path.join(BOOKS, `${id}-chapters.json`),
    JSON.stringify({
      book: { id, religion, title: book, translationName, translator, script, language },
      chapters: chapters.map((c) => ({
        number: c.number,
        title: c.title || '',
        verseCount: c.verses.length,
      })),
    }),
  )

  let bytes = 0
  for (const f of files) bytes += (await fs.stat(path.join(ROOT, 'public', f.path))).size

  const summary = {
    id,
    religion,
    title: book,
    language,
    script,
    translationName,
    translator,
    license,
    sourceUrl,
    coverage,
    notes,
    verseCount,
    chapterCount: chapters.length,
    files,
    chaptersFile,
    autoTranslit,
    bytes,
    ...extra,
  }
  await fs.writeFile(path.join(SUMMARIES, `${id}.json`), JSON.stringify(summary, null, 2))
  console.log(
    `  ✓ ${id}: ${verseCount} verses, ${chapters.length} chapters, ${files.length} shard(s)`,
  )
  return summary
}

/* ------------------------------------------------------------------ *
 * Wikisource helpers
 *
 * The proofread text of a scanned book lives in the Page: namespace, one
 * wikitext page per scanned leaf. The API returns up to 50 of them per
 * request, which keeps a whole canon (the Rig Veda runs to ~1,100 leaves)
 * to a couple of dozen polite calls instead of a thousand.
 * ------------------------------------------------------------------ */

const WIKI_API = 'https://en.wikisource.org/w/api.php'
const WIKI_UA =
  'ScriptureSearch/1.0 (open-source scripture reader; offline data build; https://en.wikisource.org)'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let lastCall = 0

/** One throttled, cached API call. Rate limiting is answered with a wait. */
async function wikiApi(params, { key, minGap = 1200, retries = 5 } = {}) {
  await ensureDirs()
  const dir = path.join(CACHE, 'wiki')
  await fs.mkdir(dir, { recursive: true })
  const cacheKey = key || crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex')
  const file = path.join(dir, cacheKey.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json')
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    /* not cached yet */
  }
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    const gap = lastCall + minGap - Date.now()
    if (gap > 0) await wait(gap)
    lastCall = Date.now()
    try {
      const url = `${WIKI_API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`
      const res = await fetch(url, { headers: { 'user-agent': WIKI_UA } })
      const text = await res.text()
      if (/too many requests|rate limit/i.test(text.slice(0, 400))) {
        throw new Error('rate limited')
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = JSON.parse(text)
      if (json.error) throw new Error(json.error.info || json.error.code)
      await fs.writeFile(file, JSON.stringify(json))
      return json
    } catch (err) {
      lastErr = err
      await wait(4000 * attempt)
    }
  }
  throw lastErr
}

/** Number of scanned leaves in a DjVu index file. */
export async function djvuPageCount(indexName) {
  const json = await wikiApi({
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'size',
    titles: `Index:${indexName}`,
  }, { key: `idxcount-${indexName}` })
  const page = json.query?.pages?.[0]
  // Fall back to a generous bound; missing leaves simply come back as null.
  return page?.imageinfo?.[0]?.height ? 2000 : 2000
}

/**
 * Raw wikitext of Page:<index>/<n> for a contiguous run of leaves.
 * Returns one object per leaf, in reading order, with empty leaves as ''. 
 */
export async function djvuPages(indexName, from, to, { batch = 50 } = {}) {
  const out = []
  for (let start = from; start <= to; start += batch) {
    const nums = []
    for (let n = start; n < Math.min(start + batch, to + 1); n++) nums.push(n)
    const titles = nums.map((n) => `Page:${indexName}/${n}`).join('|')
    const json = await wikiApi(
      { action: 'query', prop: 'revisions', rvslots: 'main', rvprop: 'content', titles },
      { key: `pages-${indexName.replace(/\W/g, '_')}-${start}` },
    )
    const byTitle = new Map()
    for (const p of json.query?.pages || []) {
      byTitle.set(p.title, p.revisions?.[0]?.slots?.main?.content || '')
    }
    for (const n of nums) {
      out.push({ n, title: `Page:${indexName}/${n}`, text: byTitle.get(`Page:${indexName}/${n}`) || '' })
    }
    console.log(`    pages ${nums[0]}–${nums[nums.length - 1]}`)
  }
  return out
}

/**
 * Render a transclusion of scanned leaves (a whole chapter or book of a
 * proofread volume) in a single API call. Returns the rendered HTML.
 */
export async function transcludeLeaves(indexName, from, to, { key } = {}) {
  const text = `<pages index="${indexName}" from=${from} to=${to} />`
  const params = {
    action: 'parse',
    text,
    contentmodel: 'wikitext',
    prop: 'text',
    format: 'json',
    formatversion: '2',
  }
  const out = await wikiApi(params, { key, minGap: 2500 })
  return out.parse?.text || ''
}

/** Wikitext of up to 50 ordinary wiki pages in one call. */
export async function wikiPages(titles, { prefix = 'wp', redirects = true } = {}) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50)
    const json = await wikiApi(
      {
        action: 'query',
        prop: 'revisions',
        rvslots: 'main',
        rvprop: 'content',
        titles: chunk.join('|'),
        redirects: redirects ? '1' : undefined,
      },
      { key: `${prefix}-${i}` },
    )
    const norm = new Map()
    for (const r of json.query?.redirects || []) norm.set(r.from, r.to)
    for (const r of json.query?.normalized || []) norm.set(r.from, r.to)
    const byTitle = new Map()
    for (const p of json.query?.pages || []) {
      byTitle.set(p.title, p.revisions?.[0]?.slots?.main?.content || '')
    }
    for (const t of chunk) {
      const resolved = norm.get(t) || t
      out.set(t, byTitle.get(resolved) ?? byTitle.get(t) ?? '')
    }
  }
  return out
}

/** Rendered HTML of a wiki page, following redirects. */
export async function pageHtml(title, { key } = {}) {
  const out = await wikiApi(
    { action: 'parse', page: title, prop: 'text', redirects: '1', formatversion: '2' },
    { key: key || `html-${crypto.createHash('sha1').update(title).digest('hex')}` },
  )
  if (!out.parse) throw new Error(`Could not render “${title}”`)
  return out.parse.text
}

/**
 * Turn proofread wikitext into plain text: footnotes and page furniture are
 * dropped, while templates that merely style scripture ({{sc|…}}, {{l|…}})
 * keep their contents so no word of the text is lost.
 */
export function plainWiki(raw) {
  if (!raw) return ''
  let s = String(raw)
  s = s.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, ' ')
  s = s.replace(/<ref[^>]*\/>/gi, ' ')
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  // Styling templates keep their text.
  const KEEP = /\{\{\s*(?:sc|smallcaps|uc|asc|l|xl|xxl|larger|small|nowrap|center|c)\s*\|([^{}]*)\}\}/gi
  let prev
  do {
    prev = s
    s = s.replace(KEEP, '$1')
  } while (s !== prev && /\{\{\s*(?:sc|l|xl|c)\s*\|/i.test(s))
  // Everything else that is still a template (heads, rules, params) is dropped.
  s = removeTemplates(s)
  s = s.replace(/<[^>]+>/g, ' ')
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
  s = s.replace(/'''?/g, '')
  s = s.replace(/&nbsp;|&#160;/g, ' ')
  s = s.replace(/<<<|>>>/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/** Collapse a rendered block of HTML into plain text with lines preserved. */
export function blockText(el, $) {
  let html = $.html(el) || ''
  html = html.replace(/<sup[^>]*class="reference"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
  html = html.replace(/<span[^>]*class="pagenum[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ')
  html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  html = html.replace(/<br\s*\/?>/gi, '\n')
  html = html.replace(/<\/(?:p|div|h[1-6]|li|dd|dt|tr)>/gi, '\n')
  html = html.replace(/<[^>]+>/g, '')
  html = html
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, d) => String.fromCodePoint(parseInt(d, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\u200b\u00ad]/g, '')
  return html
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .trim()
}

/** True when a rendered line is a section heading rather than scripture. */
export function isHeading(line) {
  const s = line.trim()
  if (!s || s.length > 90) return false
  if (/^(footnotes|references|contents|introduction)\b/i.test(s)) return true
  const KEY = /(KHA|VALL|ADHY|ANUV|PRAP|BR[ÂA]HMA|MUNDAK|UPANISH|QUESTION|CHAPTER|HYMN|BOOK|PART|SECTION)/i
  const letters = s.replace(/[^A-Za-zÂÊÎÔÛ]/g, '')
  if (!KEY.test(s)) return false
  const upper = letters.replace(/[^A-ZÂÊÎÔÛ]/g, '').length
  return upper >= Math.max(3, letters.length * 0.5) || s.length < 60
}

/** Remove {{…}} including nested braces. */
function removeTemplates(s) {
  let out = ''
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith('{{', i)) {
      depth++
      i++
      continue
    }
    if (s.startsWith('}}', i) && depth > 0) {
      depth--
      i++
      continue
    }
    if (depth === 0) out += s[i]
  }
  return out
}

export function verseId(bookSlug, chapter, verse) {
  return `${bookSlug}-${chapter}-${verse}`
}

/** Tag a batch of verses in place using the shared theme map. */
export function tagVerses(verses, tag) {
  for (const v of verses) {
    if (!v.tags || v.tags.length === 0) v.tags = tag(v.translation || '')
  }
  return verses
}

export function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
