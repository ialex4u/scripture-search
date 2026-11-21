import { useState } from 'react'
import type { Script, Verse } from '../lib/types'
import { highlightParts } from '../lib/search'
import { isBookmarked, toggleBookmark } from '../lib/storage'
import { useSettings } from '../lib/settings'

export function scriptClass(script?: Script) {
  switch (script) {
    case 'arabic':
      return 'script-arabic'
    case 'hebrew':
      return 'script-hebrew'
    case 'devanagari':
      return 'script-devanagari'
    case 'gurmukhi':
      return 'script-gurmukhi'
    case 'han':
      return 'script-han'
    default:
      return 'script-latin'
  }
}

export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlightParts(text, terms).map((part, i) =>
        part.hit ? (
          <mark key={i}>{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

// Equal, neutral styling for every tradition: same shape, same weight.
const RELIGION_BADGE =
  'border-stone-300 text-stone-600 dark:border-stone-600 dark:text-stone-300'

export interface VerseCardProps {
  verse: Verse
  bookId: string
  script?: Script
  terms?: string[]
  onRemove?: () => void
  savedLabel?: boolean
}

export default function VerseCard({
  verse,
  bookId,
  script,
  terms = [],
  onRemove,
  savedLabel = false,
}: VerseCardProps) {
  const { settings } = useSettings()
  const [saved, setSaved] = useState(() => isBookmarked(verse.id))
  const [toast, setToast] = useState('')

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 1600)
  }

  const copy = async () => {
    const text = `${verse.translation}\n— ${verse.ref || `${verse.book} ${verse.chapter}:${verse.verse}`}${
      verse.translationName ? ` (${verse.translationName})` : ''
    }`
    try {
      await navigator.clipboard.writeText(text)
      flash('Copied')
    } catch {
      flash('Copy unavailable')
    }
  }

  const share = async () => {
    const text = `${verse.translation}\n— ${verse.ref || ''}${verse.translationName ? ` · ${verse.translationName}` : ''}\n\nShared from Scripture Search`
    if (navigator.share) {
      try {
        await navigator.share({ title: verse.ref || verse.book, text })
        return
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      flash('Copied to share')
    } catch {
      flash('Sharing unavailable')
    }
  }

  const bookmark = () => {
    const next = toggleBookmark(verse, bookId)
    const nowSaved = next.some((b) => b.id === verse.id)
    setSaved(nowSaved)
    flash(nowSaved ? 'Bookmarked' : 'Bookmark removed')
    onRemove?.()
  }

  return (
    <article className="card relative p-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${RELIGION_BADGE}`}>
          {verse.religion}
        </span>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {verse.ref || `${verse.book} ${verse.chapter}:${verse.verse}`}
        </span>
      </div>

      {settings.showTranslation && (
        <p className="reading text-ink-800 dark:text-parchment-100">
          <Highlighted text={verse.translation} terms={terms} />
        </p>
      )}

      {settings.showOriginal && verse.original && (
        <p className={`mt-3 text-stone-800 dark:text-stone-100 ${scriptClass(script)}`}>
          {verse.original}
        </p>
      )}

      {settings.showTranslit && verse.translit && (
        <p className="mt-2 text-sm italic leading-relaxed text-stone-500 dark:text-stone-400">
          {verse.translit}
          {verse.autoTranslit && (
            <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[0.62rem] not-italic uppercase tracking-wide text-stone-500 dark:bg-stone-700 dark:text-stone-300">
              auto-transliterated
            </span>
          )}
        </p>
      )}

      {(verse.tags?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {verse.tags!.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-[0.68rem] text-stone-600 dark:bg-stone-700/70 dark:text-stone-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 dark:border-stone-700/60">
        <p className="max-w-[60%] truncate text-[0.7rem] text-stone-400" title={verse.translationName}>
          {verse.translationName}
          {verse.translator ? ` · ${verse.translator}` : ''}
        </p>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={copy} className="icon-btn h-9 w-9" aria-label="Copy verse">
            <CopyIcon />
          </button>
          <button type="button" onClick={share} className="icon-btn h-9 w-9" aria-label="Share verse">
            <ShareIcon />
          </button>
          <button
            type="button"
            onClick={bookmark}
            className={`icon-btn h-9 w-9 ${saved ? 'text-accent dark:text-teal-300' : ''}`}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark verse'}
            aria-pressed={saved}
          >
            <BookmarkIcon filled={saved} />
          </button>
          {savedLabel && onRemove && (
            <button type="button" onClick={onRemove} className="ml-1 text-xs text-stone-400 underline">
              remove
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-ink-900 px-3 py-1 text-xs text-white shadow-lg dark:bg-parchment-100 dark:text-ink-900">
          {toast}
        </div>
      )}
    </article>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  )
}
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" />
    </svg>
  )
}
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  )
}
