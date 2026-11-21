import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegistry } from '../lib/hooks'

export default function Browse() {
  const { registry, error } = useRegistry()
  const [openReligion, setOpenReligion] = useState<string | null>(null)

  const religions = useMemo(() => registry?.religions || [], [registry])

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Browse</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Every tradition, from its own texts. Choose a collection, then a chapter.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">Could not load the registry.</p>}

      <div className="mt-4 space-y-3">
        {religions.map((religion) => {
          const open = openReligion === religion.id
          const bundled = religion.books.filter((b) => (b.verseCount || 0) > 0)
          const unavailable = religion.books.filter((b) => !(b.verseCount || 0))
          return (
            <section key={religion.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenReligion(open ? null : religion.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <span>
                  <span className="block text-base font-semibold">{religion.name}</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400">
                    {bundled.length} collection{bundled.length === 1 ? '' : 's'}
                    {unavailable.length ? ` · ${unavailable.length} not bundled` : ''}
                  </span>
                </span>
                <span className={`text-stone-400 transition ${open ? 'rotate-90' : ''}`} aria-hidden>
                  ›
                </span>
              </button>

              {open && (
                <div className="border-t border-stone-100 dark:border-stone-700/60">
                  {bundled.map((book) => (
                    <Link
                      key={book.id}
                      to={`/browse/${book.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{book.title}</span>
                        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                          {book.translationName}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-400">
                        {(book.verseCount || 0).toLocaleString()} verses
                      </span>
                    </Link>
                  ))}

                  {unavailable.map((book) => (
                    <div key={book.id} className="px-4 py-3 opacity-70">
                      <p className="text-sm font-medium">{book.title}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Not bundled: {book.reason || 'no openly licensed digital edition available'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {!religions.length && !error && (
        <p className="py-10 text-center text-sm text-stone-500">Loading collections…</p>
      )}
    </div>
  )
}
