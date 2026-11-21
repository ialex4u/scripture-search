import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VerseCard from '../components/VerseCard'
import { useRegistry } from '../lib/hooks'
import { loadChapter } from '../lib/registry'
import { saveLastRead } from '../lib/storage'
import { useSettings } from '../lib/settings'
import type { BookFile, BookMeta, Chapter } from '../lib/types'

interface ChapterEntry {
  number: number
  title: string
}

export default function Reader() {
  const { bookId, chapter: chapterParam } = useParams()
  const chapterNo = Number(chapterParam)
  const { registry } = useRegistry()
  const meta = useMemo<BookMeta | undefined>(
    () => registry?.books.find((b) => b.id === bookId),
    [registry, bookId],
  )
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [book, setBook] = useState<BookFile['book'] | null>(null)
  const [chapters, setChapters] = useState<ChapterEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const { settings, update } = useSettings()

  useEffect(() => {
    if (!meta) return
    let alive = true
    setChapter(null)
    setError(null)
    loadChapter(meta, chapterNo)
      .then(({ chapter: ch, book: b }) => {
        if (!alive) return
        setChapter(ch)
        setBook(b)
        saveLastRead({
          bookId: meta.id,
          bookTitle: meta.title,
          chapter: ch.number,
          chapterTitle: ch.title,
          at: Date.now(),
        })
        document.querySelector('main')?.scrollTo({ top: 0 })
        window.scrollTo({ top: 0 })
      })
      .catch((e) => alive && setError(String(e.message || e)))
    return () => {
      alive = false
    }
  }, [meta, chapterNo])

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

  const index = chapters.findIndex((c) => c.number === chapterNo)
  const prev = index > 0 ? chapters[index - 1] : null
  const next = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link to={meta ? `/browse/${meta.id}` : '/browse'} className="text-sm font-medium text-accent dark:text-teal-300">
          ← {meta?.title || 'Browse'}
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="icon-btn h-9 w-9"
            aria-label="Smaller text"
            onClick={() => update({ fontScale: Math.max(0.85, Math.round((settings.fontScale - 0.1) * 100) / 100) })}
          >
            A−
          </button>
          <button
            type="button"
            className="icon-btn h-9 w-9"
            aria-label="Larger text"
            onClick={() => update({ fontScale: Math.min(1.6, Math.round((settings.fontScale + 0.1) * 100) / 100) })}
          >
            A+
          </button>
        </div>
      </div>

      {chapter && (
        <>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">
            {chapter.title || `${meta?.title} ${chapter.number}`}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {book?.translationName} · {book?.translator}
          </p>
        </>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-600">
          This chapter could not be loaded. Reconnect once so it can be cached, then try again.
        </p>
      )}

      {!chapter && !error && (
        <p className="py-10 text-center text-sm text-stone-500">Loading chapter…</p>
      )}

      <div className="mt-4 space-y-3">
        {chapter?.verses.map((verse) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            bookId={meta?.id || ''}
            script={meta?.script}
            terms={[]}
          />
        ))}
      </div>

      {chapter && (
        <div className="mt-6 flex items-center justify-between gap-2">
          {prev ? (
            <Link to={`/read/${meta?.id}/${prev.number}`} className="btn-ghost flex-1">
              ← {prev.title || `Chapter ${prev.number}`}
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link to={`/read/${meta?.id}/${next.number}`} className="btn-ghost flex-1 justify-end text-right">
              {next.title || `Chapter ${next.number}`} →
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-stone-400">
        Text shown as published in the source edition. Translations are interpretations and may
        differ across scholars.
      </p>
    </div>
  )
}
