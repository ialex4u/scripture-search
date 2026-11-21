import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import VerseCard from '../components/VerseCard'
import { useRegistry, useSynonyms } from '../lib/hooks'
import { addRecent, clearRecents, loadRecents } from '../lib/storage'
import type { Script, Verse } from '../lib/types'

interface VotdEntry extends Verse {
  bookId: string
  script?: Script
}

const SUGGESTED = [
  'love',
  'peace',
  'forgiveness',
  'patience',
  'justice',
  'fear',
  'death',
  'hope',
  'wisdom',
  'mercy',
  'prayer',
  'truth',
]

export default function Home() {
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<string[]>(() => loadRecents())
  const { registry, error } = useRegistry()
  const synonyms = useSynonyms()
  const [votd, setVotd] = useState<VotdEntry | null>(null)

  useEffect(() => {
    fetch('data/votd.json')
      .then((r) => r.json())
      .then((list: VotdEntry[]) => {
        if (!Array.isArray(list) || !list.length) return
        const day = Math.floor(Date.now() / 86_400_000)
        setVotd(list[day % list.length])
      })
      .catch(() => undefined)
  }, [])

  const themeChips = useMemo(() => {
    if (!synonyms) return SUGGESTED
    return SUGGESTED.filter((s) => s in synonyms)
  }, [synonyms])

  const runSearch = (value: string) => {
    setQuery(value)
    if (value.trim().length > 1) {
      addRecent(value)
      setRecents(loadRecents())
    }
  }

  return (
    <div>
      <section className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Search the world’s scriptures
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Qur’an, Hadith, Bible, Gita, Dhammapada, Guru Granth Sahib and more — by word, feeling, or
          theme.
        </p>
        <div className="mt-4">
          <SearchBar value={query} onChange={runSearch} />
        </div>

        {!query && (
          <>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {themeChips.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => runSearch(theme)}
                  className="chip shrink-0 capitalize"
                >
                  {theme}
                </button>
              ))}
            </div>

            {recents.length > 0 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="shrink-0 text-xs font-medium text-stone-400">Recent</span>
                {recents.map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    onClick={() => runSearch(recent)}
                    className="shrink-0 rounded-full bg-stone-200/70 px-3 py-1 text-xs text-stone-600 dark:bg-stone-700 dark:text-stone-300"
                  >
                    {recent}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    clearRecents()
                    setRecents([])
                  }}
                  className="shrink-0 text-xs text-stone-400 underline"
                >
                  clear
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {query.trim().length > 1 ? (
        registry ? (
          <SearchResults query={query} registry={registry} filtered />
        ) : (
          <p className="py-10 text-center text-sm text-stone-500">Loading collections…</p>
        )
      ) : (
        <>
          {votd && (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                  Verse of the day
                </h2>
              </div>
              <VerseCard
                verse={votd}
                bookId={votd.bookId}
                script={votd.script}
                terms={[]}
              />
            </section>
          )}

          <section className="mt-6 grid gap-2">
            <Link to="/browse" className="card flex items-center justify-between p-4">
              <span>
                <span className="block font-semibold">Browse by religion</span>
                <span className="block text-sm text-stone-500">
                  {registry
                    ? `${registry.stats.bundledBooks} collections · ${registry.stats.verses.toLocaleString()} verses`
                    : 'Loading collection list…'}
                </span>
              </span>
              <span aria-hidden className="text-stone-400">
                →
              </span>
            </Link>
            <Link to="/bookmarks" className="card flex items-center justify-between p-4">
              <span>
                <span className="block font-semibold">Your bookmarks</span>
                <span className="block text-sm text-stone-500">Saved on this device</span>
              </span>
              <span aria-hidden className="text-stone-400">
                →
              </span>
            </Link>
          </section>

          <p className="mt-6 text-xs leading-relaxed text-stone-400">
            Free and private: no accounts, no tracking, no server. Downloaded collections stay
            readable offline. Translations are interpretations and may differ across scholars.
          </p>
        </>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600">
          Could not load the collection list. Reconnect once to finish setup.
        </p>
      )}
    </div>
  )
}
