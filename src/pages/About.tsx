import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useRegistry } from '../lib/hooks'

export default function About() {
  const { registry } = useRegistry()
  const bundled = useMemo(
    () => (registry?.books || []).filter((b) => (b.verseCount || 0) > 0),
    [registry],
  )
  const missing = useMemo(
    () => (registry?.books || []).filter((b) => !(b.verseCount || 0)),
    [registry],
  )

  return (
    <div className="pb-4">
      <h1 className="text-xl font-semibold tracking-tight">About</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        Scripture Search is a free, non-commercial reader for the major religious texts of the
        world. It searches across traditions by keyword, emotion, or theme, and shows each verse
        with its exact reference, original-language text where available, transliteration, and the
        name of the translation used.
      </p>

      <section className="card mt-4 p-4">
        <h2 className="font-semibold">Respect & accuracy</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          <li>Texts are reproduced from the named source editions, unaltered.</li>
          <li>No paraphrase, commentary, ranking, or interpretation is added.</li>
          <li>Every tradition uses the same neutral card and badge design.</li>
          <li>
            <strong>Translations are interpretations</strong> and may differ across scholars.
            Inclusion of a translation is not an endorsement of its wording.
          </li>
          <li>
            Where no openly licensed digital edition could be verified, the collection is listed as
            not bundled — content is never invented or machine-generated.
          </li>
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Bundled editions ({bundled.length})
        </h2>
        <div className="mt-2 space-y-2">
          {bundled.map((book) => (
            <div key={book.id} className="card p-3">
              <p className="text-sm font-semibold">
                {book.title} <span className="font-normal text-stone-400">· {book.religion}</span>
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {book.translationName}
                {book.translator ? ` — ${book.translator}` : ''}
              </p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-stone-400">{book.license}</p>
              {book.sourceUrl && (
                <a
                  href={book.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-block break-all text-[0.7rem] text-accent underline dark:text-teal-300"
                >
                  {book.sourceUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {missing.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Not bundled
          </h2>
          <div className="mt-2 space-y-2">
            {missing.map((book) => (
              <div key={book.id} className="card p-3">
                <p className="text-sm font-medium">
                  {book.title} <span className="font-normal text-stone-400">· {book.religion}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  {book.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-4 p-4">
        <h2 className="font-semibold">Privacy & cost</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          No accounts, analytics, advertising, cookies, or backend. Bookmarks, settings and recent
          searches live in your browser’s storage and never leave the device. The app is a static
          site: it can be hosted free on GitHub Pages or Cloudflare Pages.
        </p>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="font-semibold">How search works</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Each collection ships with a prebuilt MiniSearch index. When you search, collections
          load progressively — smallest first — so results appear immediately and your phone never
          downloads every scripture at once. The theme map is a plain JSON file you can edit in the
          project.
        </p>
      </section>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link to="/settings" className="font-medium text-accent dark:text-teal-300">
          ← Settings
        </Link>
        <span className="text-xs text-stone-400">
          Data built {registry ? new Date(registry.generated).toLocaleDateString() : '—'}
        </span>
      </div>
    </div>
  )
}
