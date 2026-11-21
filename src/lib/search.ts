import MiniSearch from 'minisearch'
import type { BookMeta, SearchHit } from './types'
import { loadSynonyms } from './registry'

export interface SearchOptions {
  religions: string[]
  bookIds: string[]
  limitPerBook?: number
}

interface IndexResponse {
  bookId: string
  results: SearchHit[]
}

const MAX_TERMS = 24

/**
 * Words too common to carry meaning. Searching them matches nearly every
 * verse, which used to fill each collection's result quota before the real
 * words were ever looked at.
 */
const STOP_WORDS = new Set(
  `a an and are as at be been being but by can could did do does for from had has have he her
   here him his how i if in into is it its me might must my no nor not of on or our shall she
   should so than that the their them then there these they this those to too up us was we were
   what when where which who whom why will with would you your`
    .split(/\s+/)
    .filter(Boolean),
)

export interface QueryPlan {
  /** The words the reader typed, minus stop words. */
  literal: string[]
  /** Theme words and their aliases, used to reach verses by meaning. */
  related: string[]
  /** The words exactly as typed, in order, for spotting the same phrase in a verse. */
  phrase: string[]
}

function queryWords(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter((w) => w.length > 1),
    ),
  ]
}

/**
 * Separate what the reader typed from the theme vocabulary. The literal words
 * are what a verse must actually contain; the theme words widen the search
 * afterwards, so a match on meaning never outranks a match on wording.
 */
export function planQuery(query: string, synonyms: Record<string, string[]>): QueryPlan {
  const words = queryWords(query)
  if (!words.length) return { literal: [], related: [], phrase: [] }
  const meaningful = words.filter((w) => !STOP_WORDS.has(w))
  // A query made only of stop words (“the way”) still deserves a search.
  const literal = (meaningful.length ? meaningful : words).slice(0, MAX_TERMS)
  const related: string[] = []
  for (const [theme, aliases] of Object.entries(synonyms)) {
    if (theme.startsWith('_')) continue
    const group = [theme.toLowerCase(), ...aliases.map((a) => a.toLowerCase())]
    if (!words.some((w) => group.includes(w))) continue
    for (const term of group) {
      if (!literal.includes(term) && !related.includes(term)) related.push(term)
    }
    if (literal.length + related.length >= MAX_TERMS) break
  }
  return {
    literal,
    related: related.slice(0, Math.max(0, MAX_TERMS - literal.length)),
    phrase: words.slice(0, 8),
  }
}

/** Words to highlight in results: the query's own words plus its theme words. */
export function expandQuery(query: string, synonyms: Record<string, string[]>): string[] {
  const { literal, related } = planQuery(query, synonyms)
  return [...literal, ...related]
}

export function matchingThemes(query: string, synonyms: Record<string, string[]>): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return Object.entries(synonyms)
    .filter(([theme, aliases]) =>
      [theme.toLowerCase(), ...aliases.map((a) => a.toLowerCase())].includes(q),
    )
    .map(([theme]) => theme)
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * True when every word the reader typed appears as a whole word, so “brahman”
 * does not rank “Brahmanaspati” or “Abdur-Rahman” above verses that say
 * exactly “Brahman”.
 */
function saysEveryWord(text: string, terms: string[]): boolean {
  const hay = text.toLowerCase()
  return terms.every((term) => new RegExp(`\\b${escapeRe(term)}\\b`).test(hay))
}

/** True when the words appear in the reader's own order, not just anywhere. */
function saysPhrase(text: string, terms: string[]): boolean {
  if (terms.length < 2) return false
  const pattern = terms.map(escapeRe).join('[^a-z0-9]+')
  return new RegExp(pattern, 'i').test(text.toLowerCase())
}

const indexCache = new Map<string, Promise<MiniSearch>>()

/**
 * Fetch an index. Hosts differ: some serve the .gz bytes verbatim, others set
 * Content-Encoding and hand the browser already-inflated JSON. Accept both by
 * checking the gzip magic bytes.
 */
async function fetchIndex(bookId: string): Promise<string> {
  const res = await fetch(`data/index/${bookId}.json.gz`, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`No index for ${bookId}`)
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
  if (!isGzip) return new TextDecoder().decode(bytes)
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress the offline search index')
  }
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

function loadIndex(bookId: string): Promise<MiniSearch> {
  if (!indexCache.has(bookId)) {
    indexCache.set(
      bookId,
      fetchIndex(bookId).then((text) => {
        const json = JSON.parse(text)
        return MiniSearch.loadJSON(JSON.stringify(json), {
          fields: ['translation', 'translit', 'tags'],
          storeFields: [
            'id',
            'ref',
            'religion',
            'book',
            'bookId',
            'chapter',
            'chapterTitle',
            'verse',
            'translation',
            'translit',
            'translationName',
            'translator',
            'tags',
          ],
        })
      }),
    )
  }
  return indexCache.get(bookId)!
}

let synonymsPromise: Promise<Record<string, string[]>> | null = null
function getSynonyms() {
  if (!synonymsPromise) synonymsPromise = loadSynonyms()
  return synonymsPromise
}

/**
 * Search collections progressively: the caller receives batches as each
 * collection's prebuilt index loads, so results appear immediately instead of
 * waiting for the whole canon.
 */
export function searchCollections(
  query: string,
  books: BookMeta[],
  options: SearchOptions,
  onBatch: (batch: IndexResponse) => void,
  signal: AbortSignal,
): Promise<void> {
  return (async () => {
    const synonyms = await getSynonyms()
    const { literal, related, phrase } = planQuery(query, synonyms)
    const terms = [...literal, ...related]
    if (!terms.length) return
    const everything = [...new Set(terms)].slice(0, MAX_TERMS)

    // Tiers run from strictest to loosest. A verse containing every word the
    // reader typed always ranks above one that merely shares a theme, and a
    // spelling-tolerant match only fills the gaps. The base score keeps the
    // tiers ordered even though each one's own scores are not comparable.
    type Tier = { terms: string[]; mode: 'AND' | 'OR'; fuzzy: boolean; base: number }
    const candidates: Tier[] = [
      { terms: literal, mode: 'AND', fuzzy: false, base: 1_000_000 },
      { terms: literal, mode: 'AND', fuzzy: true, base: 100_000 },
      { terms: everything, mode: 'OR', fuzzy: false, base: 10_000 },
      { terms: everything, mode: 'OR', fuzzy: true, base: 1 },
    ]
    const tiers = candidates.filter(
      (tier, i, list) =>
        tier.terms.length > 0 &&
        list.findIndex(
          (t) =>
            t.mode === tier.mode &&
            t.fuzzy === tier.fuzzy &&
            t.terms.join(' ') === tier.terms.join(' '),
        ) === i,
    )

    let eligible = books.filter((b) => (b.verseCount || 0) > 0 && b.files?.length)
    if (options.religions.length) eligible = eligible.filter((b) => options.religions.includes(b.religion))
    if (options.bookIds.length) eligible = eligible.filter((b) => options.bookIds.includes(b.id))
    // Start with small collections so the first results feel instant, then the
    // big canons fill in.
    eligible = [...eligible].sort((a, b) => (a.verseCount || 0) - (b.verseCount || 0))

    const limit = options.limitPerBook ?? 30

    const runOne = async (book: BookMeta) => {
      if (signal.aborted) return
      try {
        const index = await loadIndex(book.id)
        if (signal.aborted) return
        const seen = new Set<string>()
        const results: SearchHit[] = []
        for (const tier of tiers) {
          if (signal.aborted || results.length >= limit) break
          const found = index.search(tier.terms.join(' '), {
            prefix: (term: string) => term.length > 2,
            fuzzy: tier.fuzzy ? 0.2 : false,
            // Theme tags help, but not enough to beat the words themselves.
            boost: { tags: 1.6, translit: 0.8 },
            combineWith: tier.mode,
          })
          for (const r of found) {
            const id = String(r.id)
            if (seen.has(id)) continue
            seen.add(id)
            results.push({
              id,
              bookId: book.id,
              religion: String(r.religion ?? book.religion),
              book: String(r.book ?? book.title),
              chapter: Number(r.chapter),
              chapterTitle: r.chapterTitle ? String(r.chapterTitle) : undefined,
              verse: Number(r.verse),
              ref: String(r.ref ?? ''),
              translation: String(r.translation ?? ''),
              translit: String(r.translit ?? ''),
              original: '',
              translationName: String(r.translationName ?? book.translationName ?? ''),
              translator: r.translator ? String(r.translator) : undefined,
              tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
              // Within a tier, a verse that says the word exactly beats one that
              // only shares a prefix or a theme tag.
              score:
                tier.base +
                (saysPhrase(String(r.translation ?? ''), phrase) ? 20_000 : 0) +
                (saysEveryWord(String(r.translation ?? ''), literal) ? 2_000 : 0) +
                Number(r.score ?? 0),
              matchedTerms: terms.filter((t) =>
                `${r.translation} ${r.translit} ${(r.tags as string[])?.join(' ')}`
                  .toLowerCase()
                  .includes(t),
              ),
            })
            if (results.length >= limit) break
          }
          if (results.length >= limit) break
        }
        if (results.length && !signal.aborted) {
          onBatch({ bookId: book.id, results })
        }
      } catch {
        /* a missing index simply means this collection has no bundled data */
      }
    }

    const CONCURRENCY = 3
    let cursor = 0
    const workers = Array.from({ length: Math.min(CONCURRENCY, eligible.length) }, async () => {
      while (cursor < eligible.length && !signal.aborted) {
        const book = eligible[cursor++]
        await runOne(book)
      }
    })
    await Promise.all(workers)
  })()
}

/** Split text into React-friendly segments with the matched terms marked. */
export function highlightParts(text: string, terms: string[]): { text: string; hit: boolean }[] {
  if (!text || !terms.length) return [{ text, hit: false }]
  const cleaned = [...terms]
    .filter((t) => t && t.length > 1)
    .sort((a, b) => b.length - a.length)
    .slice(0, 24)
  if (!cleaned.length) return [{ text, hit: false }]
  const escaped = cleaned.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts: { text: string; hit: boolean }[] = []
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false })
    parts.push({ text: m[0], hit: true })
    last = m.index + m[0].length
    if (m[0].length === 0) re.lastIndex++
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false })
  return parts
}
