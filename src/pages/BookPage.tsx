import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRegistry } from '../lib/hooks'
import type { BookMeta } from '../lib/types'

interface ChapterEntry {
  number: number
  title: string
  verseCount: number
}

export default function BookPage() {
  const { bookId } = useParams()
  const { registry } = useRegistry()
  const meta = useMemo<BookMeta | undefined>(
    () => registry?.books.find((b) => b.id === bookId),
    [registry, bookId],
  )
  const [chapters, setChapters] = useState<ChapterEntry[]>([])
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(120)

  useEffect(() => {
    if (!meta?.chaptersFile) return
    let alive = true
    fetch(meta.chaptersFile)
      .then((r) => r.json())
      .then((json: { chapters: ChapterEntry[] }) => alive && setChapters(json.chapters))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [meta])

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = f
      ? chapters.filter(
          (c) => c.title.toLowerCase().includes(f) || String(c.number).includes(f),
        )
      : chapters
    return list.slice(0, limit)
  }, [chapters, filter, limit])

  if (!meta) {
    return <p className="py-10 text-center text-sm text-stone-500">Loading collection…</p>
  }

  return (
    <div>
      <Link to="/browse" className="text-sm font-medium text-accent dark:text-teal-300">
        ← Browse
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{meta.title}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {meta.translationName}
        {meta.translator ? ` · ${meta.translator}` : ''}
      </p>
      <p className="mt-2 text-xs text-stone-400">
        {(meta.verseCount || 0).toLocaleString()} verses · {chapters.length || meta.chapterCount || 0}{' '}
        {meta.id === 'guru-granth-sahib' ? 'Angs' : 'chapters'}
        {meta.coverage && meta.coverage !== 'complete' ? ` · ${meta.coverage}` : ''}
      </p>

      <input
        type="search"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value)
          setLimit(120)
        }}
        placeholder="Find a chapter or section…"
        className="mt-4 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-800"
      />

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shown.map((chapter) => (
          <Link
            key={chapter.number}
            to={`/read/${meta.id}/${chapter.number}`}
            className="card flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {chapter.title || `Chapter ${chapter.number}`}
              </span>
              <span className="block text-[0.68rem] text-stone-400">
                {chapter.verseCount} verse{chapter.verseCount === 1 ? '' : 's'}
              </span>
            </span>
            <span className="text-stone-400" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-6 text-center text-sm text-stone-500">No chapters match that search.</p>
      )}

      {shown.length < (filter ? chapters.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase())).length : chapters.length) && (
        <button type="button" onClick={() => setLimit((l) => l + 200)} className="btn-ghost mt-4 w-full">
          Show more chapters
        </button>
      )}

      <p className="mt-5 text-xs leading-relaxed text-stone-400">{meta.license}</p>
    </div>
  )
}
