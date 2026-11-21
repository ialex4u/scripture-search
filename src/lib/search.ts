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

/** Build the set of words to search for: the query itself plus theme synonyms. */
export function expandQuery(query: string, synonyms: Record<string, string[]>): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = new Set<string>()
  for (const word of q.split(/\s+/)) {
    if (word.length > 1) terms.add(word)
  }
  if (q.length > 1) terms.add(q)
  for (const [theme, aliases] of Object.entries(synonyms)) {
    const group = [theme.toLowerCase(), ...aliases.map((a) => a.toLowerCase())]
    if (group.includes(q) || q.split(/\s+/).some((w) => group.includes(w))) {
      group.forEach((term) => terms.add(term))
    }
    if (terms.size >= MAX_TERMS) break
  }
  return [...terms].slice(0, MAX_TERMS)
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
    const terms = expandQuery(query, synonyms)
    if (!terms.length) return

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
        for (const term of terms) {
          if (signal.aborted) return
          const found = index.search(term, {
            prefix: term.length > 2,
            fuzzy: term.length > 3 ? 0.2 : false,
            boost: { tags: 2.5, translit: 0.8 },
            combineWith: 'OR',
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
              score: Number(r.score ?? 0),
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
