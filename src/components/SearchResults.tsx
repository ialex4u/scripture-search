import { useMemo, useState } from 'react'
import type { BookMeta, Registry, SearchHit } from '../lib/types'
import { useInfiniteCount, useSearch, type SearchFilters } from '../lib/hooks'
import { useSettings } from '../lib/settings'
import VerseCard from './VerseCard'
import Filters from './Filters'

interface Props {
  query: string
  registry: Registry
  filtered?: boolean
}

const EMPTY: SearchFilters = { religions: [], bookIds: [] }

export default function SearchResults({ query, registry }: Props) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY)
  const { settings } = useSettings()
  const { hits, loading, terms, searched, error } = useSearch(
    query,
    filters,
    registry.books.filter((b) => (b.verseCount || 0) > 0),
  )

  const metaById = useMemo(() => {
    const map = new Map<string, BookMeta>()
    registry.books.forEach((b) => map.set(b.id, b))
    return map
  }, [registry])

  const ordered = useMemo(() => {
    const religionOrder = new Map(registry.religions.map((r, i) => [r.name, i]))
    const list = [...hits]
    if (settings.sortBy === 'relevance' && query.trim().length > 1) {
      list.sort((a, b) => b.score - a.score)
    } else {
      list.sort((a, b) => {
        const ao = religionOrder.get(a.religion) ?? 99
        const bo = religionOrder.get(b.religion) ?? 99
        if (ao !== bo) return ao - bo
        if (a.bookId !== b.bookId) return a.bookId.localeCompare(b.bookId)
        if (a.chapter !== b.chapter) return a.chapter - b.chapter
        return a.verse - b.verse
      })
    }
    return list
  }, [hits, settings.sortBy, query, registry.religions])

  const { count, sentinel } = useInfiniteCount(ordered.length)
  const visible = ordered.slice(0, count)
  const grouped = settings.sortBy !== 'relevance'

  const groups = useMemo(() => {
    if (!grouped) return [{ religion: '', items: visible }]
    const map = new Map<string, SearchHit[]>()
    for (const hit of visible) {
      if (!map.has(hit.religion)) map.set(hit.religion, [])
      map.get(hit.religion)!.push(hit)
    }
    return [...map.entries()].map(([religion, items]) => ({ religion, items }))
  }, [visible, grouped])

  return (
    <section className="mt-3" aria-live="polite">
      <Filters registry={registry} filters={filters} onChange={setFilters} resultCount={ordered.length} />

      {query.trim().length < 2 ? (
        <p className="py-10 text-center text-sm text-stone-500">
          Type at least two letters to search.
        </p>
      ) : (
        <>
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
              Searching{searched > 0 ? ` · ${searched} collections scanned` : ' collections'}…
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {!loading && ordered.length === 0 && !error && (
            <div className="card mt-4 p-6 text-center">
              <p className="font-medium">No verses matched “{query.trim()}”.</p>
              <p className="mt-1 text-sm text-stone-500">
                Try a simpler word, a feeling like “grief”, or a theme like “patience”.
              </p>
            </div>
          )}

          <div className="mt-4 space-y-5">
            {groups.map((group) => (
              <div key={group.religion || 'all'}>
                {group.religion && (
                  <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                    {group.religion}
                    <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                  </h2>
                )}
                <div className="space-y-3">
                  {group.items.map((hit) => (
                    <VerseCard
                      key={hit.id}
                      verse={hit}
                      bookId={hit.bookId}
                      script={metaById.get(hit.bookId)?.script}
                      terms={terms}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {visible.length < ordered.length && (
            <div ref={sentinel} className="h-10" aria-hidden />
          )}

          {!loading && ordered.length > 0 && (
            <p className="mt-6 rounded-xl bg-stone-100 p-3 text-center text-xs leading-relaxed text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              Translations are interpretations and may differ across scholars. Every result shows
              its exact reference and translation name.
            </p>
          )}
        </>
      )}
    </section>
  )
}
