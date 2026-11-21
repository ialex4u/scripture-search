import { useEffect, useMemo, useRef, useState } from 'react'
import { loadRegistry, loadSynonyms, bundledBooks } from './registry'
import { expandQuery, searchCollections } from './search'
import type { BookMeta, Registry, SearchHit } from './types'

export function useRegistry() {
  const [registry, setRegistry] = useState<Registry | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadRegistry()
      .then((r) => alive && setRegistry(r))
      .catch((e) => alive && setError(String(e.message || e)))
    return () => {
      alive = false
    }
  }, [])
  return { registry, error, books: registry ? bundledBooks(registry) : [] }
}

export function useSynonyms() {
  const [synonyms, setSynonyms] = useState<Record<string, string[]> | null>(null)
  useEffect(() => {
    let alive = true
    loadSynonyms()
      .then((s) => alive && setSynonyms(s))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  return synonyms
}

export interface SearchFilters {
  religions: string[]
  bookIds: string[]
}

export function useSearch(query: string, filters: SearchFilters, books: BookMeta[]) {
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const synonyms = useSynonyms()
  const booksRef = useRef(books)
  booksRef.current = books

  const religionsKey = filters.religions.join(',')
  const booksKey = filters.bookIds.join(',')

  const terms = useMemo(
    () => (query.trim().length > 1 && synonyms ? expandQuery(query, synonyms) : []),
    [query, synonyms],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || !booksRef.current.length) {
      setHits([])
      setLoading(false)
      setSearched(0)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setHits([])
    setSearched(0)
    const seen = new Map<string, SearchHit>()
    let batches = 0

    searchCollections(
      q,
      booksRef.current,
      { religions: filters.religions, bookIds: filters.bookIds },
      (batch) => {
        batches++
        for (const hit of batch.results) {
          if (!seen.has(hit.id)) seen.set(hit.id, hit)
        }
        setHits([...seen.values()])
        setSearched(batches)
      },
      controller.signal,
    )
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e.message || e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, religionsKey, booksKey])

  return { hits, loading, terms, searched, error }
}

/** Infinite scroll: reveal more of the already-ranked results as the user reads. */
export function useInfiniteCount(total: number, initial = 18, step = 18) {
  const [count, setCount] = useState(initial)
  const sentinel = useRef<HTMLDivElement | null>(null)

  useEffect(() => setCount(initial), [total, initial])

  useEffect(() => {
    const node = sentinel.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => Math.min(c + step, total))
        }
      },
      { rootMargin: '400px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [total, step])

  return { count, sentinel }
}
