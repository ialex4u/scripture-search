import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import { useRegistry } from '../lib/hooks'
import { addRecent } from '../lib/storage'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') || ''
  const [query, setQuery] = useState(initial)
  const { registry } = useRegistry()

  useEffect(() => {
    setQuery(params.get('q') || '')
  }, [params])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (query.trim().length > 1) addRecent(query)
      setParams(query ? { q: query } : {}, { replace: true })
    }, 350)
    return () => window.clearTimeout(id)
  }, [query, setParams])

  return (
    <div className="pt-2">
      <SearchBar value={query} onChange={setQuery} autoFocus={!initial} />
      {registry ? (
        <SearchResults query={query} registry={registry} filtered />
      ) : (
        <p className="py-10 text-center text-sm text-stone-500">Loading collections…</p>
      )}
    </div>
  )
}
